import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { userScoreHistory, repoScoreHistory } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';
import { checkRepositoryWriteAccess } from '@/lib/wiki/permissions';

export const scoreHistoryRouter = router({
  // Get user score history
  getUserScoreHistory: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      username: z.string().optional(),
      limit: z.number().min(1).max(100).default(30),
      source: z.string().optional(), // Filter by source type
    }))
    .query(async ({ input }) => {
      const { userId, username, limit, source } = input;

      if (!userId && !username) {
        return [];
      }

      const conditions = [];
      if (userId) {
        conditions.push(eq(userScoreHistory.userId, userId));
      }
      if (username) {
        conditions.push(eq(userScoreHistory.username, username));
      }
      if (source) {
        conditions.push(eq(userScoreHistory.source, source));
      }

      const history = await db
        .select()
        .from(userScoreHistory)
        .where(and(...conditions))
        .orderBy(desc(userScoreHistory.createdAt))
        .limit(limit);

      return history.map((entry) => ({
        date: entry.createdAt.toISOString(),
        score: entry.eloRating || entry.overallScore || 0,
        source: entry.source,
        metadata: entry.metadata,
      }));
    }),

  // Get repository score history
  getRepoScoreHistory: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      ref: z.string().default('main'),
      limit: z.number().min(1).max(100).default(30),
    }))
    .query(async ({ input, ctx }) => {
      const { owner, repo, ref, limit } = input;

      // Historical metrics are repository-derived data. Check current
      // visibility before returning them, including after a public-to-private
      // transition.
      if (!await getAccessibleRepositoryInfo(owner, repo, ctx.session)) return [];
      // This legacy table has neither an author nor a visibility marker, and
      // no current write path. Existing rows may have come from private code
      // before a repository was made public, so restrict them to current
      // repository contributors rather than exposing them anonymously.
      if (!ctx.session?.user || !await checkRepositoryWriteAccess(ctx.session, owner, repo)) return [];

      const history = await db
        .select()
        .from(repoScoreHistory)
        .where(
          and(
            eq(repoScoreHistory.repoOwner, owner),
            eq(repoScoreHistory.repoName, repo),
            eq(repoScoreHistory.ref, ref)
          )
        )
        .orderBy(desc(repoScoreHistory.createdAt))
        .limit(limit);

      return history.map((entry) => ({
        date: entry.createdAt.toISOString(),
        score: entry.overallScore,
        metrics: entry.metrics,
      }));
    }),
});
