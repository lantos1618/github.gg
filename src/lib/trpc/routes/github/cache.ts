import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { createGitHubServiceFromSession } from '@/lib/github';
import { db } from '@/db';
import { cachedRepos, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseError } from '@/lib/types/errors';

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export const cacheRouter = router({
  // Force refresh cache for a specific repo
  refreshRepoCache: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubServiceFromSession(ctx.session);
        const details = await githubService.getRepositoryDetails(input.owner, input.repo);
        const userId = ctx.session?.user?.id ?? null;
        
        // Only set userId if user exists in database
        let finalUserId = null;
        if (userId) {
          try {
            const userExists = await db.select().from(user).where(eq(user.id, userId)).limit(1);
            finalUserId = userExists.length > 0 ? userId : null;
          } catch {
            console.warn(`User ${userId} not found in database, caching repo without user association`);
            finalUserId = null;
          }
        }
        
        await db
          .insert(cachedRepos)
          .values({
            owner: details.owner,
            name: details.name,
            description: details.description,
            stargazersCount: details.stargazersCount,
            forksCount: details.forksCount,
            language: details.language,
            topics: details.topics,
            userId: finalUserId,
            lastFetched: new Date(),
          })
          .onConflictDoUpdate({
            target: [cachedRepos.owner, cachedRepos.name, cachedRepos.userId],
            set: {
              description: details.description,
              stargazersCount: details.stargazersCount,
              forksCount: details.forksCount,
              language: details.language,
              topics: details.topics,
              lastFetched: new Date(),
            },
          });

        return { ...details, userId: finalUserId };
      } catch (error: unknown) {
        const errorMessage = parseError(error);
        throw new Error(`Failed to refresh repository cache: ${errorMessage}`);
      }
    }),

  // Check if cache needs refresh
  checkCacheStatus: publicProcedure
    .query(async () => {
      try {
        const now = new Date();
        const cacheThreshold = new Date(now.getTime() - CACHE_DURATION);
        const allCachedRepos = await db.select().from(cachedRepos);
        
        const staleRepos = allCachedRepos.filter(repo => repo.lastFetched < cacheThreshold);
        const needsRefresh = staleRepos.length > 0;
        
        return {
          needsRefresh,
          totalCached: allCachedRepos.length,
          staleCount: staleRepos.length,
          oldestCache: allCachedRepos.length > 0 ? Math.min(...allCachedRepos.map(r => r.lastFetched.getTime())) : null
        };
      } catch (error: unknown) {
        const errorMessage = parseError(error);
        throw new Error(`Failed to check cache status: ${errorMessage}`);
      }
    }),
}); 