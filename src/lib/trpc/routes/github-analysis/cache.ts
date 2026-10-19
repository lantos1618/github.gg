import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { prAnalysisCache, issueAnalysisCache } from '@/db/schema';
import { and, or, desc, eq } from 'drizzle-orm';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';

export const githubAnalysisCacheRouter = router({
  // Cached analyses can contain private repository data. Check current access
  // even if this repository was public when the cache entry was written.
  getCachedPRAnalysis: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
      version: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { owner, repo, number, version } = input;

      const repoInfo = await getAccessibleRepositoryInfo(owner, repo, ctx.session);
      if (!repoInfo) return null;

      try {
        const conditions = [
          eq(prAnalysisCache.repoOwner, owner),
          eq(prAnalysisCache.repoName, repo),
          eq(prAnalysisCache.prNumber, number),
        ];
        if (repoInfo.private && ctx.session?.user?.id) {
          conditions.push(eq(prAnalysisCache.userId, ctx.session.user.id));
        }
        conditions.push(ctx.session?.user?.id
          ? or(eq(prAnalysisCache.isPrivate, false), eq(prAnalysisCache.userId, ctx.session.user.id))!
          : eq(prAnalysisCache.isPrivate, false));

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

  // Apply the same access rule to cached issue analyses.
  getCachedIssueAnalysis: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
      version: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { owner, repo, number, version } = input;

      const repoInfo = await getAccessibleRepositoryInfo(owner, repo, ctx.session);
      if (!repoInfo) return null;

      try {
        const conditions = [
          eq(issueAnalysisCache.repoOwner, owner),
          eq(issueAnalysisCache.repoName, repo),
          eq(issueAnalysisCache.issueNumber, number),
        ];
        if (repoInfo.private && ctx.session?.user?.id) {
          conditions.push(eq(issueAnalysisCache.userId, ctx.session.user.id));
        }
        conditions.push(ctx.session?.user?.id
          ? or(eq(issueAnalysisCache.isPrivate, false), eq(issueAnalysisCache.userId, ctx.session.user.id))!
          : eq(issueAnalysisCache.isPrivate, false));

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
