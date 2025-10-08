import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { userScoreHistory, repoScoreHistory } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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
    .query(async ({ input }) => {
      const { owner, repo, ref, limit } = input;

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
