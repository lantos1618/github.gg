import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db';
import { insightsCache } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateScorecardAnalysis } from '@/lib/ai/scorecard';

export const scorecardRouter = router({
  generateScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      files: z.array(z.object({
        path: z.string(),
        content: z.string(),
        size: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { repo, files } = input;
      
      try {
        // Generate scorecard using the AI service
        const markdownScorecard = await generateScorecardAnalysis({
          files,
          repoName: repo,
        });
        
        return {
          scorecard: markdownScorecard,
          cached: false,
          stale: false,
          lastUpdated: new Date(),
        };
      } catch (error) {
        console.error('🔥 Raw error in scorecard route:', error);
        console.error('🔥 Error type:', typeof error);
        console.error('🔥 Error message:', error instanceof Error ? error.message : 'No message');
        console.error('🔥 Error stack:', error instanceof Error ? error.stack : 'No stack');
        
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate repository scorecard';
        throw new Error(userFriendlyMessage);
      }
    }),

  getScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
    }))
    .query(async ({ input, ctx }) => {
      const { user, repo, ref } = input;
      
      // Check for cached scorecard
      const cached = await db
        .select()
        .from(insightsCache)
        .where(
          and(
            eq(insightsCache.userId, ctx.session!.user.id),
            eq(insightsCache.repoOwner, user),
            eq(insightsCache.repoName, repo),
            eq(insightsCache.ref, ref)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        const scorecard = cached[0];
        const isStale = new Date().getTime() - scorecard.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        
        return {
          scorecard: scorecard.insights,
          cached: true,
          stale: isStale,
          lastUpdated: scorecard.updatedAt,
        };
      }

      return {
        scorecard: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  cacheScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      scorecard: z.any(), // The full scorecard object
    }))
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref, scorecard } = input;

      // Upsert scorecard cache
      await db
        .insert(insightsCache)
        .values({
          userId: ctx.session!.user.id,
          repoOwner: user,
          repoName: repo,
          ref,
          insights: scorecard,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [insightsCache.userId, insightsCache.repoOwner, insightsCache.repoName, insightsCache.ref],
          set: {
            insights: scorecard,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),

  clearCache: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref } = input;

      await db
        .delete(insightsCache)
        .where(
          and(
            eq(insightsCache.userId, ctx.session!.user.id),
            eq(insightsCache.repoOwner, user),
            eq(insightsCache.repoName, repo),
            eq(insightsCache.ref, ref)
          )
        );

      return { success: true };
    }),
});
