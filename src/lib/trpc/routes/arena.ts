import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { 
  developerRankings, 
  arenaBattles, 
  tokenUsage,
  developerProfileCache
} from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { analyzeBattle, calculateEloChange, determineTier } from '@/lib/ai/battle-analysis';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { 
  getOrCreateRanking, 
  updateRankings
} from '@/lib/arena/battle-helpers';
import { INITIAL_ELO_RATING, BYOK_DAILY_BATTLE_LIMIT, ALL_BATTLE_CRITERIA } from '@/lib/constants/arena';
import { generateDeveloperProfile } from '@/lib/ai/developer-profile';
import type { DeveloperProfile } from '@/lib/types/profile';
import type { BattleCriteria } from '@/lib/types/arena';
import { sql } from 'drizzle-orm';

// Helper function to check if a profile is stale (older than 24 hours)
function isProfileStale(updatedAt: Date): boolean {
  return new Date().getTime() - updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
}

export const arenaRouter = router({
  // Get user's ranking (now public, but requires userId or username)
  getMyRanking: publicProcedure
    .input(z.object({ userId: z.string().optional(), username: z.string().optional() }))
    .query(async ({ input }) => {
      // If userId is provided, use it; otherwise, fallback to username
      if (input.userId) {
        return await getOrCreateRanking(input.userId, input.username || 'Unknown');
      } else if (input.username) {
        // Look up by username only (public)
        const existing = await db
          .select()
          .from(developerRankings)
          .where(eq(developerRankings.username, input.username))
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

        // --- NEW BATTLE LOGIC ---
        const githubService = await createGitHubServiceForUserOperations(ctx.session);

        // Function to get or generate a developer profile
        const getOrGenerateProfile = async (username: string): Promise<DeveloperProfile> => {
          // Check for existing cached profile
          const existing = await db
            .select()
            .from(developerProfileCache)
            .where(eq(developerProfileCache.username, username))
            .limit(1);
          
          if (existing[0] && !isProfileStale(existing[0].updatedAt)) {
            return existing[0].profileData as DeveloperProfile;
          }
          
          // Generate a new profile if it's missing or stale
          const repos = await githubService.getUserRepositories(username);
          if (repos.length === 0) throw new Error(`${username} has no public repositories.`);
          
          const result = await generateDeveloperProfile({ 
            username, 
            repos, 
            userId: ctx.user.id // Attribute generation to the challenger
          });
          
          // Get next version number
          const maxVersionResult = await db
            .select({ max: sql<number>`MAX(version)` })
            .from(developerProfileCache)
            .where(eq(developerProfileCache.username, username));
          const nextVersion = (maxVersionResult[0]?.max || 0) + 1;
          
          await db.insert(developerProfileCache).values({
            username,
            version: nextVersion,
            profileData: result.profile,
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: [developerProfileCache.username, developerProfileCache.version],
            set: { profileData: result.profile, updatedAt: new Date() }
          });
          
          return result.profile;
        };

        // Get profiles for both developers
        const [challengerProfile, opponentProfile] = await Promise.all([
          getOrGenerateProfile(battle.challengerUsername),
          getOrGenerateProfile(battle.opponentUsername),
        ]);

        // Analyze battle using the structured profiles
        const battleAnalysis = await analyzeBattle(
          challengerProfile,
          opponentProfile,
          battle.challengerUsername,
          battle.opponentUsername,
          (battle.criteria as BattleCriteria[]) || ALL_BATTLE_CRITERIA
        );
        // --- END OF NEW BATTLE LOGIC ---

        // Get current rankings
        const [challengerRanking, opponentRanking] = await Promise.all([
          db.select().from(developerRankings).where(eq(developerRankings.userId, battle.challengerId)).limit(1),
          db.select().from(developerRankings).where(eq(developerRankings.userId, battle.opponentId)).limit(1)
        ]);

        // Calculate ELO changes
        const challengerWon = battleAnalysis.result.winner === battle.challengerUsername;
        const challengerCurrentRating = challengerRanking[0]?.eloRating || INITIAL_ELO_RATING;
        const opponentCurrentRating = opponentRanking[0]?.eloRating || INITIAL_ELO_RATING;

        const eloChanges = calculateEloChange(
          challengerCurrentRating,
          opponentCurrentRating,
          challengerWon
        );

        // Update battle results
        const updatedBattle = await updateBattleResults(
          battle,
          battleAnalysis.result,
          challengerRanking[0],
          opponentRanking[0],
          {
            challenger: {
              before: challengerCurrentRating,
              after: eloChanges.challenger.newRating,
              change: eloChanges.challenger.change,
            },
            opponent: {
              before: opponentCurrentRating,
              after: eloChanges.opponent.newRating,
              change: eloChanges.opponent.change,
            },
          },
          challengerWon
        );

        // Update user rankings
        await updateUserRankings(
          battle,
          challengerRanking[0],
          opponentRanking[0],
          eloChanges,
          challengerWon
        );

        // Log token usage
        await logTokenUsage(
          ctx.user.id,
          battle.challengerUsername,
          battleAnalysis.usage,
          plan === 'byok'
        );

        return {
          battle: updatedBattle,
          analysis: battleAnalysis.result,
          eloChange: eloChanges,
        };

      } catch (error) {
        console.error('Battle execution failed:', error);
        
        // Update battle status to failed
        await db
          .update(arenaBattles)
          .set({ 
            status: 'failed',
            completedAt: new Date(),
          })
          .where(eq(arenaBattles.id, battleId));

        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Battle execution failed. Please try again.' 
        });
      }
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
      const ranking = await db
        .select()
        .from(developerRankings)
        .where(eq(developerRankings.username, input.username))
        .limit(1);
      return ranking[0] || null;
    }),
});

async function validateBattle(battleId: string, userId: string) {
  const battle = await db
    .select()
    .from(arenaBattles)
    .where(
      and(
        eq(arenaBattles.id, battleId),
        eq(arenaBattles.challengerId, userId),
        eq(arenaBattles.status, 'pending')
      )
    )
    .limit(1);

  if (battle.length === 0) {
    throw new TRPCError({ 
      code: 'NOT_FOUND', 
      message: 'Battle not found or already completed' 
    });
  }

  return battle[0];
}

async function updateBattleResults(
  battle: typeof arenaBattles.$inferSelect,
  battleAnalysis: {
    winner: string;
    reason: string;
    challengerScore: { total: number; breakdown: Record<string, number> };
    opponentScore: { total: number; breakdown: Record<string, number> };
    highlights: string[];
    recommendations: string[];
  },
  challengerRanking: typeof developerRankings.$inferSelect | undefined,
  opponentRanking: typeof developerRankings.$inferSelect | undefined,
  eloChanges: { challenger: { before: number; after: number; change: number }; opponent: { before: number; after: number; change: number } },
  challengerWon: boolean
) {
  const winnerId = challengerWon ? battle.challengerId : battle.opponentId;

  const updatedBattle = await db
    .update(arenaBattles)
    .set({
      status: 'completed',
      winnerId,
      scores: {
        challenger: battleAnalysis.challengerScore,
        opponent: battleAnalysis.opponentScore,
      },
      aiAnalysis: {
        winner: battleAnalysis.winner,
        reason: battleAnalysis.reason,
        highlights: battleAnalysis.highlights,
        recommendations: battleAnalysis.recommendations,
      },
      eloChange: eloChanges,
      completedAt: new Date(),
    })
    .where(eq(arenaBattles.id, battle.id))
    .returning();

  return updatedBattle[0];
}

async function updateUserRankings(
  battle: typeof arenaBattles.$inferSelect,
  challengerRanking: typeof developerRankings.$inferSelect | undefined,
  opponentRanking: typeof developerRankings.$inferSelect | undefined,
  eloChanges: { challenger: { change: number; newRating: number }; opponent: { change: number; newRating: number } },
  challengerWon: boolean
) {
  const challengerTier = determineTier(eloChanges.challenger.newRating);
  const opponentTier = determineTier(eloChanges.opponent.newRating);

  await updateRankings(
    battle.challengerId,
    battle.opponentId,
    challengerWon,
    eloChanges,
    challengerTier,
    opponentTier
  );
}

async function logTokenUsage(
  userId: string,
  username: string,
  usage: { totalTokens: number },
  isByok: boolean
) {
  await db.insert(tokenUsage).values({
    userId,
    feature: 'arena_battle',
    repoOwner: username,
    repoName: null,
    model: 'gemini-1.5-flash',
    promptTokens: 0, // Not available in current implementation
    completionTokens: 0, // Not available in current implementation
    totalTokens: usage.totalTokens,
    isByok,
    createdAt: new Date(),
  });
} 