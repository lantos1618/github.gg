import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { 
  developerRankings, 
  arenaBattles, 
  tokenUsage 
} from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { analyzeBattle, calculateEloChange, calculateKFactor } from '@/lib/ai/battle-analysis';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { 
  fetchDeveloperData, 
  getOrCreateRanking, 
  updateRanking, 
  calculateTotalTokenUsage 
} from '@/lib/arena/battle-helpers';
import { INITIAL_ELO_RATING, BYOK_DAILY_BATTLE_LIMIT, ALL_BATTLE_CRITERIA } from '@/lib/constants/arena';

export const arenaRouter = router({
  // Get user's ranking
  getMyRanking: protectedProcedure
    .query(async ({ ctx }) => {
      return await getOrCreateRanking(ctx.user.id, ctx.user.name || 'Unknown');
    }),

  // Get global leaderboard
  getLeaderboard: protectedProcedure
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

      // Calculate win rates and add rank
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

  // Challenge another developer
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

      // Check if opponent exists and get their data
      const githubService = await createGitHubServiceForUserOperations(ctx.session);
      const opponentRepos = await githubService.getUserRepositories(opponentUsername);
      
      if (opponentRepos.length === 0) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Opponent not found or has no public repositories' 
        });
      }

      // Check if opponent is a registered user
      const opponentRanking = await db
        .select()
        .from(developerRankings)
        .where(eq(developerRankings.username, opponentUsername))
        .limit(1);

      // For non-registered opponents, use a dummy ID
      const opponentId = opponentRanking[0]?.userId || `dummy_${opponentUsername}`;

      // Create battle record
      const battle = await db
        .insert(arenaBattles)
        .values({
          challengerId: ctx.user.id,
          opponentId,
          challengerUsername: ctx.user.name || 'Unknown',
          opponentUsername,
          status: 'pending',
          battleType: 'standard', // Only standard battles supported
          criteria,
        })
        .returning();

      return battle[0];
    }),

  // Execute a battle
  executeBattle: protectedProcedure
    .input(z.object({
      battleId: z.string().min(1, 'Battle ID is required'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { battleId } = input;

      // Validate battle
      const battle = await validateBattle(battleId, ctx.user.id);

      try {
        // Get API key info
        const { plan } = await getUserPlanAndKey(ctx.user.id);
        const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
        if (!keyInfo) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Please add your Gemini API key in settings to use this feature' 
          });
        }
        
        // Fetch developer data in parallel
        const [challengerData, opponentData] = await Promise.all([
          fetchDeveloperData(battle.challengerUsername, ctx.session, ctx.user.id),
          fetchDeveloperData(battle.opponentUsername, ctx.session, ctx.user.id)
        ]);

        // Analyze battle
        const battleAnalysis = await analyzeBattle(
          {
            username: challengerData.username,
            profile: challengerData.profile,
            repos: challengerData.repos,
          },
          {
            username: opponentData.username,
            profile: opponentData.profile,
            repos: opponentData.repos,
          },
          battle.criteria as any
        );

        // Get current rankings
        const [challengerRanking, opponentRanking] = await Promise.all([
          db.select().from(developerRankings).where(eq(developerRankings.userId, battle.challengerId)).limit(1),
          db.select().from(developerRankings).where(eq(developerRankings.userId, battle.opponentId)).limit(1)
        ]);

        // Calculate ELO changes
        const challengerWon = battleAnalysis.result.analysis.winner === battle.challengerUsername;
        const eloChanges = calculateEloChange(
          challengerRanking[0]?.eloRating || INITIAL_ELO_RATING,
          opponentRanking[0]?.eloRating || INITIAL_ELO_RATING,
          challengerWon,
          calculateKFactor(challengerRanking[0]?.totalBattles || 0, challengerRanking[0]?.eloRating || INITIAL_ELO_RATING)
        );

        // Update battle with results
        await updateBattleResults(battle, battleAnalysis, challengerRanking[0], opponentRanking[0], eloChanges, challengerWon);

        // Update rankings (only for registered users)
        await updateUserRankings(battle, challengerRanking[0], opponentRanking[0], eloChanges, challengerWon);

        // Log token usage
        await logTokenUsage(
          ctx.user.id,
          battle.challengerUsername,
          calculateTotalTokenUsage(battleAnalysis.usage, challengerData.profileUsage, opponentData.profileUsage),
          keyInfo.isByok
        );

        return battleAnalysis.result;

      } catch (error) {
        console.error('Error executing battle:', error);
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to execute battle' 
        });
      }
    }),

  // Get battle history
  getBattleHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, offset } = input;

      const battles = await db
        .select()
        .from(arenaBattles)
        .where(
          and(
            eq(arenaBattles.status, 'completed'),
            eq(arenaBattles.challengerId, ctx.user.id)
          )
        )
        .orderBy(desc(arenaBattles.completedAt))
        .limit(limit)
        .offset(offset);

      return battles;
    }),
});

// Helper functions

async function validateBattle(battleId: string, userId: string) {
  const battles = await db
    .select()
    .from(arenaBattles)
    .where(eq(arenaBattles.id, battleId))
    .limit(1);

  if (battles.length === 0) {
    throw new TRPCError({ 
      code: 'NOT_FOUND', 
      message: 'Battle not found' 
    });
  }

  const battle = battles[0];

  if (battle.status !== 'pending') {
    throw new TRPCError({ 
      code: 'BAD_REQUEST', 
      message: 'Battle has already been executed' 
    });
  }

  if (battle.challengerId !== userId) {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Only the challenger can execute the battle' 
    });
  }

  return battle;
}

async function updateBattleResults(
  battle: any,
  battleAnalysis: any,
  challengerRanking: any,
  opponentRanking: any,
  eloChanges: any,
  challengerWon: boolean
) {
  await db
    .update(arenaBattles)
    .set({
      status: 'completed',
      winnerId: challengerWon ? battle.challengerId : battle.opponentId,
      scores: battleAnalysis.result.battle.scores,
      aiAnalysis: battleAnalysis.result.analysis,
      eloChange: {
        challenger: {
          before: challengerRanking?.eloRating || INITIAL_ELO_RATING,
          after: (challengerRanking?.eloRating || INITIAL_ELO_RATING) + eloChanges.challengerChange,
          change: eloChanges.challengerChange,
        },
        opponent: {
          before: opponentRanking?.eloRating || INITIAL_ELO_RATING,
          after: (opponentRanking?.eloRating || INITIAL_ELO_RATING) + eloChanges.opponentChange,
          change: eloChanges.opponentChange,
        },
      },
      completedAt: new Date(),
    })
    .where(eq(arenaBattles.id, battle.id));
}

async function updateUserRankings(
  battle: any,
  challengerRanking: any,
  opponentRanking: any,
  eloChanges: any,
  challengerWon: boolean
) {
  if (challengerRanking) {
    await updateRanking(
      battle.challengerId,
      challengerRanking,
      eloChanges.challengerChange,
      challengerWon
    );
  }

  // Only update opponent ranking if they're a registered user
  if (opponentRanking && !battle.opponentId.startsWith('dummy_')) {
    await updateRanking(
      battle.opponentId,
      opponentRanking,
      eloChanges.opponentChange,
      !challengerWon
    );
  }
}

async function logTokenUsage(
  userId: string,
  username: string,
  usage: any,
  isByok: boolean
) {
  await db.insert(tokenUsage).values({
    userId,
    feature: 'arena_battle',
    repoOwner: username,
    repoName: null,
    model: 'gemini-2.5-flash',
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    isByok,
    createdAt: new Date(),
  });
} 