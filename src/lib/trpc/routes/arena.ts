import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { 
  user,
  developerRankings, 
  arenaBattles, 
  achievements,
  userAchievements,
  tokenUsage 
} from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { analyzeBattle, calculateEloChange, getTierFromElo, calculateKFactor } from '@/lib/ai/battle-analysis';
import { generateDeveloperProfile } from '@/lib/ai/developer-profile';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForUserOperations } from '@/lib/github';

export const arenaRouter = router({
  // Get user's ranking
  getMyRanking: protectedProcedure
    .query(async ({ ctx }) => {
      const ranking = await db
        .select()
        .from(developerRankings)
        .where(eq(developerRankings.userId, ctx.user.id))
        .limit(1);

      if (ranking.length === 0) {
        // Create initial ranking
        const newRanking = await db
          .insert(developerRankings)
          .values({
            userId: ctx.user.id,
            username: ctx.user.name || 'Unknown',
            eloRating: 1200,
            tier: 'Bronze',
          })
          .returning();

        return newRanking[0];
      }

      return ranking[0];
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
      battleType: z.enum(['standard', 'tournament', 'friendly']).optional().default('standard'),
      criteria: z.array(z.enum([
        'code_quality',
        'project_complexity', 
        'skill_diversity',
        'innovation',
        'documentation',
        'testing',
        'architecture',
        'performance',
        'security',
        'maintainability'
      ])).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { opponentUsername, battleType, criteria } = input;

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
        
        if (todayBattles.length >= 3) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Daily limit of 3 battles reached. Upgrade to Pro for unlimited battles.' 
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

      // For non-registered opponents, we'll use a simple approach
      // Just create a battle record with the opponent username
      // The battle execution will handle the GitHub data directly
      let opponentId = opponentRanking[0]?.userId;
      
      if (!opponentId) {
        // Use a simple dummy ID for non-registered opponents
        opponentId = `dummy_${opponentUsername}`;
      }

      // Create battle record
      const battle = await db
        .insert(arenaBattles)
        .values({
          challengerId: ctx.user.id,
          opponentId: opponentId,
          challengerUsername: ctx.user.name || 'Unknown',
          opponentUsername,
          status: 'pending',
          battleType,
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

      // Get battle
      const battle = await db
        .select()
        .from(arenaBattles)
        .where(eq(arenaBattles.id, battleId))
        .limit(1);

      if (battle.length === 0) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Battle not found' 
        });
      }

      if (battle[0].status !== 'pending') {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Battle has already been executed' 
        });
      }

      // Check if user is the challenger
      if (battle[0].challengerId !== ctx.user.id) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Only the challenger can execute the battle' 
        });
      }

      try {
        // Get API key info for token usage tracking
        const { plan } = await getUserPlanAndKey(ctx.user.id);
        const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
        if (!keyInfo) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Please add your Gemini API key in settings to use this feature' 
          });
        }
        
        // Get challenger data
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        console.log(`🏆 Battle: Fetching repositories for challenger ${battle[0].challengerUsername}`);
        const challengerRepos = await githubService.getUserRepositories(battle[0].challengerUsername);
        console.log(`✅ Challenger repos found: ${challengerRepos.length}`);
        
        // Log top repositories being used for analysis
        const topChallengerRepos = challengerRepos
          .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0))
          .slice(0, 10);
        console.log(`📊 Top challenger repos for analysis:`, topChallengerRepos.map(r => `${r.owner}/${r.name} (${r.stargazersCount}⭐)`));
        
        // Generate challenger profile
        console.log(`🧠 Generating profile for challenger ${battle[0].challengerUsername}`);
        const challengerProfileResult = await generateDeveloperProfile(
          battle[0].challengerUsername,
          challengerRepos,
          undefined,
          ctx.user.id
        );

        // Get opponent data
        console.log(`🏆 Battle: Fetching repositories for opponent ${battle[0].opponentUsername}`);
        const opponentRepos = await githubService.getUserRepositories(battle[0].opponentUsername);
        console.log(`✅ Opponent repos found: ${opponentRepos.length}`);
        
        // Log top repositories being used for analysis
        const topOpponentRepos = opponentRepos
          .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0))
          .slice(0, 10);
        console.log(`📊 Top opponent repos for analysis:`, topOpponentRepos.map(r => `${r.owner}/${r.name} (${r.stargazersCount}⭐)`));
        
        // Generate opponent profile
        console.log(`🧠 Generating profile for opponent ${battle[0].opponentUsername}`);
        const opponentProfileResult = await generateDeveloperProfile(
          battle[0].opponentUsername,
          opponentRepos,
          undefined,
          ctx.user.id
        );

        // Analyze battle
        const battleAnalysis = await analyzeBattle(
          {
            username: battle[0].challengerUsername,
            profile: challengerProfileResult.profile,
            repos: challengerRepos,
          },
          {
            username: battle[0].opponentUsername,
            profile: opponentProfileResult.profile,
            repos: opponentRepos,
          },
          battle[0].criteria as ("code_quality" | "project_complexity" | "skill_diversity" | "innovation" | "documentation" | "testing" | "architecture" | "performance" | "security" | "maintainability")[] | undefined
        );

        // Get current rankings
        const challengerRanking = await db
          .select()
          .from(developerRankings)
          .where(eq(developerRankings.userId, battle[0].challengerId))
          .limit(1);

        // For opponents, check if they're registered
        const opponentRanking = await db
          .select()
          .from(developerRankings)
          .where(eq(developerRankings.userId, battle[0].opponentId))
          .limit(1);

        // Calculate ELO changes
        const challengerWon = battleAnalysis.result.analysis.winner === battle[0].challengerUsername;
        const challengerKFactor = calculateKFactor(
          challengerRanking[0]?.totalBattles || 0,
          challengerRanking[0]?.eloRating || 1200,
          battle[0].battleType === 'tournament'
        );
        const opponentKFactor = calculateKFactor(
          opponentRanking[0]?.totalBattles || 0,
          opponentRanking[0]?.eloRating || 1200,
          battle[0].battleType === 'tournament'
        );

        const eloChanges = calculateEloChange(
          challengerRanking[0]?.eloRating || 1200,
          opponentRanking[0]?.eloRating || 1200,
          challengerWon,
          challengerKFactor
        );

        // Update battle with results
        await db
          .update(arenaBattles)
          .set({
            status: 'completed',
            winnerId: challengerWon ? battle[0].challengerId : battle[0].opponentId,
            scores: battleAnalysis.result.battle.scores,
            aiAnalysis: battleAnalysis.result.analysis,
            eloChange: {
              challenger: {
                before: challengerRanking[0]?.eloRating || 1200,
                after: (challengerRanking[0]?.eloRating || 1200) + eloChanges.challengerChange,
                change: eloChanges.challengerChange,
              },
              opponent: {
                before: opponentRanking[0]?.eloRating || 1200,
                after: (opponentRanking[0]?.eloRating || 1200) + eloChanges.opponentChange,
                change: eloChanges.opponentChange,
              },
            },
            completedAt: new Date(),
          })
          .where(eq(arenaBattles.id, battleId));

        // Update rankings - only for registered users
        if (challengerRanking[0]) {
          const newChallengerElo = challengerRanking[0].eloRating + eloChanges.challengerChange;
          await db
            .update(developerRankings)
            .set({
              eloRating: newChallengerElo,
              wins: challengerRanking[0].wins + (challengerWon ? 1 : 0),
              losses: challengerRanking[0].losses + (challengerWon ? 0 : 1),
              totalBattles: challengerRanking[0].totalBattles + 1,
              winStreak: challengerWon ? challengerRanking[0].winStreak + 1 : 0,
              bestWinStreak: challengerWon 
                ? Math.max(challengerRanking[0].bestWinStreak, challengerRanking[0].winStreak + 1)
                : challengerRanking[0].bestWinStreak,
              tier: getTierFromElo(newChallengerElo),
              lastBattleAt: new Date(),
            })
            .where(eq(developerRankings.userId, battle[0].challengerId));
        }

        // Only update opponent ranking if they're a registered user
        if (opponentRanking[0] && !battle[0].opponentId.startsWith('dummy_')) {
          const newOpponentElo = opponentRanking[0].eloRating + eloChanges.opponentChange;
          await db
            .update(developerRankings)
            .set({
              eloRating: newOpponentElo,
              wins: opponentRanking[0].wins + (challengerWon ? 0 : 1),
              losses: opponentRanking[0].losses + (challengerWon ? 1 : 0),
              totalBattles: opponentRanking[0].totalBattles + 1,
              winStreak: challengerWon ? 0 : opponentRanking[0].winStreak + 1,
              bestWinStreak: challengerWon 
                ? opponentRanking[0].bestWinStreak
                : Math.max(opponentRanking[0].bestWinStreak, opponentRanking[0].winStreak + 1),
              tier: getTierFromElo(newOpponentElo),
              lastBattleAt: new Date(),
            })
            .where(eq(developerRankings.userId, battle[0].opponentId));
        }

        // Log token usage
        const totalTokens = battleAnalysis.usage.totalTokens + 
                           challengerProfileResult.usage.totalTokens + 
                           opponentProfileResult.usage.totalTokens;

        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'arena_battle',
          repoOwner: battle[0].challengerUsername,
          repoName: null,
          model: 'gemini-2.5-flash',
          promptTokens: battleAnalysis.usage.promptTokens + 
                       challengerProfileResult.usage.promptTokens + 
                       opponentProfileResult.usage.promptTokens,
          completionTokens: battleAnalysis.usage.completionTokens + 
                           challengerProfileResult.usage.completionTokens + 
                           opponentProfileResult.usage.completionTokens,
          totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });

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

  // Get user achievements
  getMyAchievements: protectedProcedure
    .query(async ({ ctx }) => {
      const userAchievementsData = await db
        .select({
          achievement: achievements,
          unlockedAt: userAchievements.unlockedAt,
        })
        .from(userAchievements)
        .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
        .where(eq(userAchievements.userId, ctx.user.id))
        .orderBy(desc(userAchievements.unlockedAt));

      return userAchievementsData;
    }),
}); 