import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { prAnalysisCache, issueAnalysisCache } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export const githubAnalysisCacheRouter = router({
  // Get cached PR analysis (public endpoint)
  getCachedPRAnalysis: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
      version: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, number, version } = input;

      try {
        const conditions = [
          eq(prAnalysisCache.repoOwner, owner),
          eq(prAnalysisCache.repoName, repo),
          eq(prAnalysisCache.prNumber, number),
        ];

        if (version !== undefined) {
          conditions.push(eq(prAnalysisCache.version, version));
        }

        const baseQuery = db
          .select()
          .from(prAnalysisCache)
          .where(and(...conditions));

        const result = version === undefined
          ? await baseQuery.orderBy(desc(prAnalysisCache.version)).limit(1)
          : await baseQuery;

        if (result.length === 0) {
          return null;
        }

        return result[0];
      } catch (error) {
        console.error('Failed to fetch cached PR analysis:', error);
        return null;
      }
    }),

  // Get cached issue analysis (public endpoint)
  getCachedIssueAnalysis: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
      version: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, number, version } = input;

      try {
        const conditions = [
          eq(issueAnalysisCache.repoOwner, owner),
          eq(issueAnalysisCache.repoName, repo),
          eq(issueAnalysisCache.issueNumber, number),
        ];

        if (version !== undefined) {
          conditions.push(eq(issueAnalysisCache.version, version));
        }

        const baseQuery = db
          .select()
          .from(issueAnalysisCache)
          .where(and(...conditions));

        const result = version === undefined
          ? await baseQuery.orderBy(desc(issueAnalysisCache.version)).limit(1)
          : await baseQuery;

        if (result.length === 0) {
          return null;
        }

        return result[0];
      } catch (error) {
        console.error('Failed to fetch cached issue analysis:', error);
        return null;
      }
    }),
});
