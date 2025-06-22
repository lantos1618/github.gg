import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db';
import { insightsCache } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const insightsRouter = router({
  getInsights: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
    }))
    .query(async ({ input, ctx }) => {
      const { user, repo, ref } = input;
      
      // Check if user has access to this repo
      // TODO: Implement proper GitHub API check for private repo access
      // For now, we'll allow access and let the frontend handle the analysis
      
      // Check for cached insights
      const cached = await db
        .select()
        .from(insightsCache)
        .where(
          and(
            eq(insightsCache.userId, ctx.user.id),
            eq(insightsCache.repoOwner, user),
            eq(insightsCache.repoName, repo),
            eq(insightsCache.ref, ref)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        const insight = cached[0];
        const isStale = new Date().getTime() - insight.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        
        return {
          insights: insight.insights,
          cached: true,
          stale: isStale,
          lastUpdated: insight.updatedAt,
        };
      }

      return {
        insights: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  cacheInsights: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      insights: z.any(), // The full insights object
    }))
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref, insights } = input;

      // Upsert insights cache
      await db
        .insert(insightsCache)
        .values({
          userId: ctx.user.id,
          repoOwner: user,
          repoName: repo,
          ref,
          insights,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [insightsCache.userId, insightsCache.repoOwner, insightsCache.repoName, insightsCache.ref],
          set: {
            insights,
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
            eq(insightsCache.userId, ctx.user.id),
            eq(insightsCache.repoOwner, user),
            eq(insightsCache.repoName, repo),
            eq(insightsCache.ref, ref)
          )
        );

      return { success: true };
    }),
});
