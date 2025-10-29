import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerRankings, arenaBattles, developerEmails } from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { getOrCreateRanking } from '@/lib/arena/battle-helpers';
import { BYOK_DAILY_BATTLE_LIMIT, ALL_BATTLE_CRITERIA } from '@/lib/constants/arena';
import { validateBattle } from '@/lib/arena/repository';
import { executeBattleAsync } from '@/lib/arena/battle-executor';
import { sendBattleChallengeNotification } from '@/lib/arena/notifications';

export const arenaRouter = router({
  // Get user's ranking (public, requires userId or username)
  getMyRanking: publicProcedure
    .input(z.object({ userId: z.string().optional(), username: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.userId) {
        const { account } = await import('@/db/schema');
        const userAccount = await db.query.account.findFirst({
          where: and(
            eq(account.userId, input.userId),
            eq(account.providerId, 'github')
          ),
        });

        if (!userAccount?.accessToken) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'GitHub account not linked'
          });
        }

        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: userAccount.accessToken });
        const { data: authenticatedUser } = await octokit.rest.users.getAuthenticated();
        const githubUsername = authenticatedUser.login.toLowerCase();

        return await getOrCreateRanking(input.userId, githubUsername);
      } else if (input.username) {
        const normalizedUsername = input.username.toLowerCase();
        const existing = await db
          .select()
          .from(developerRankings)
          .where(eq(developerRankings.username, normalizedUsername))
          .limit(1);
        return existing[0] || null;
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId or username required' });
      }
    }),

  // Get global leaderboard (public)
  getLeaderboard: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      tier: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { limit, offset, tier } = input;
      const rankings = await db
        .select()
        .from(developerRankings)
        .where(tier ? eq(developerRankings.tier, tier) : undefined)
        .orderBy(desc(developerRankings.eloRating))
        .limit(limit)
        .offset(offset);

      const leaderboard = rankings.map((ranking, index) => ({
        rank: offset + index + 1,
        username: ranking.username,
        eloRating: ranking.eloRating,
        tier: ranking.tier,
        wins: ranking.wins,
        losses: ranking.losses,
        winRate: ranking.totalBattles > 0 ? (ranking.wins / ranking.totalBattles) * 100 : 0,
        totalBattles: ranking.totalBattles,
        winStreak: ranking.winStreak,
      }));

      return leaderboard;
    }),

  // Challenge another developer (protected)
  challengeDeveloper: protectedProcedure
    .input(z.object({
      opponentUsername: z.string().min(1, 'Opponent username is required'),
      criteria: z.array(z.enum(ALL_BATTLE_CRITERIA)).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { opponentUsername, criteria } = input;

      // Check for active subscription
      const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
      if (!subscription || subscription.status !== 'active') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Active subscription required for Dev Arena battles'
        });
      }

      // Get appropriate API key
      const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
      if (!keyInfo) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Please add your Gemini API key in settings to use this feature'
        });
      }

      // Check battle limits for BYOK users
      if (plan === 'byok') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayBattles = await db
          .select()
          .from(arenaBattles)
          .where(
            and(
              eq(arenaBattles.challengerId, ctx.user.id),
              gte(arenaBattles.createdAt, today)
            )
          );

        if (todayBattles.length >= BYOK_DAILY_BATTLE_LIMIT) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Daily limit of ${BYOK_DAILY_BATTLE_LIMIT} battles reached. Upgrade to Pro for unlimited battles.`
          });
        }
      }

      // Get challenger's GitHub username
      const githubService = await createGitHubServiceForUserOperations(ctx.session);

      const { account } = await import('@/db/schema');
      const userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, ctx.user.id),
          eq(account.providerId, 'github')
        ),
      });

      if (!userAccount?.accessToken) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'GitHub account not linked. Please connect your GitHub account.'
        });
      }

      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: userAccount.accessToken });
      const { data: authenticatedUser } = await octokit.rest.users.getAuthenticated();
      const challengerUsername = authenticatedUser.login.toLowerCase();

      const normalizedOpponentUsername = opponentUsername.toLowerCase();

      // Verify opponent exists
      const opponentRepos = await githubService.getUserRepositories(opponentUsername);
      if (opponentRepos.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Opponent not found or has no public repositories'
        });
      }

      // Check if opponent is registered
      const opponentRanking = await db
        .select()
        .from(developerRankings)
        .where(eq(developerRankings.username, normalizedOpponentUsername))
        .limit(1);

      const opponentId = opponentRanking[0]?.userId || `dummy_${normalizedOpponentUsername}`;

      // Create battle record
      const battle = await db
        .insert(arenaBattles)
        .values({
          challengerId: ctx.user.id,
          opponentId,
          challengerUsername,
          opponentUsername: normalizedOpponentUsername,
          status: 'pending',
          battleType: 'standard',
          criteria,
        })
        .returning();

      // Send challenge notification (non-blocking)
      await sendBattleChallengeNotification(
        opponentUsername,
        challengerUsername,
        battle[0].id
      );

      return battle[0];
    }),

  // Execute a battle (protected)
  executeBattle: protectedProcedure
    .input(z.object({
      battleId: z.string().min(1, 'Battle ID is required'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { battleId } = input;
      const battle = await validateBattle(battleId, ctx.user.id);

      try {
        const { plan } = await getUserPlanAndKey(ctx.user.id);
        const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
        if (!keyInfo) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'API Key required for this feature.'
          });
        }

        // Mark battle as in_progress
        await db
          .update(arenaBattles)
          .set({ status: 'in_progress' })
          .where(eq(arenaBattles.id, battleId));

        // Start async execution (fire and forget)
        executeBattleAsync(battleId, ctx.user.id, ctx.session, plan as 'byok' | 'pro').catch(error => {
          console.error('Async battle execution failed:', error);
        });

        return {
          battleId: battle.id,
          status: 'in_progress',
          message: 'Battle started. This may take a minute...'
        };
      } catch (error) {
        console.error('Battle initiation failed:', error);

        await db
          .update(arenaBattles)
          .set({
            status: 'failed',
            completedAt: new Date(),
          })
          .where(eq(arenaBattles.id, battleId));

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to start battle'
        });
      }
    }),

  // Check battle status (protected)
  checkBattleStatus: protectedProcedure
    .input(z.object({
      battleId: z.string().min(1, 'Battle ID is required'),
    }))
    .query(async ({ input, ctx }) => {
      const battle = await db
        .select()
        .from(arenaBattles)
        .where(
          and(
            eq(arenaBattles.id, input.battleId),
            eq(arenaBattles.challengerId, ctx.user.id)
          )
        )
        .limit(1);

      if (battle.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Battle not found'
        });
      }

      const b = battle[0];
      return {
        id: b.id,
        status: b.status,
        challengerUsername: b.challengerUsername,
        opponentUsername: b.opponentUsername,
        winnerId: b.winnerId,
        scores: b.scores,
        aiAnalysis: b.aiAnalysis,
        eloChange: b.eloChange,
        completedAt: b.completedAt,
      };
    }),

  // Get battle history (protected)
  getBattleHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, offset } = input;

      const battles = await db
        .select()
        .from(arenaBattles)
        .where(eq(arenaBattles.challengerId, ctx.user.id))
        .orderBy(desc(arenaBattles.createdAt))
        .limit(limit)
        .offset(offset);

      return battles;
    }),

  // Get ranking by username (public)
  getRankingByUsername: publicProcedure
    .input(z.object({ username: z.string().min(1, 'Username is required') }))
    .query(async ({ input }) => {
      const normalizedUsername = input.username.toLowerCase();
      const ranking = await db
        .select()
        .from(developerRankings)
        .where(eq(developerRankings.username, normalizedUsername))
        .limit(1);
      return ranking[0] || null;
    }),
});
