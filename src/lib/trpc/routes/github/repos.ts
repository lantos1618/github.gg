import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubServiceForUserOperations, RepoSummary } from '@/lib/github';
import { CACHED_REPOS } from '@/lib/constants';
import { shuffleArray } from '@/lib/utils';
import { parseError } from '@/lib/types/errors';

/**
 * ULTRATHINK REPOS ROUTER
 *
 * Philosophy: Keep it simple, fast, and stateless
 * - Anonymous users get shuffled popular repos (instant)
 * - Logged-in users get their repos via 1 fast GitHub API call
 * - No complex DB caching needed
 */
export const reposRouter = router({
  /**
   * Get repositories for scrolling - Anonymous users
   * Returns shuffled popular repos from CACHED_REPOS
   * FAST: No API calls, no DB queries
   */
  getReposForScrollingCached: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(64),
    }))
    .query(async ({ input }): Promise<RepoSummary[]> => {
      // Just shuffle and return - instant!
      const shuffled = shuffleArray([...CACHED_REPOS]).slice(0, input.limit);

      return shuffled.map(repo => ({
        owner: repo.owner,
        name: repo.name,
        description: undefined, // Will be fetched on-demand when viewing
        stargazersCount: 0, // Will be fetched on-demand
        forksCount: 0, // Will be fetched on-demand
        language: undefined,
        topics: [],
        url: `https://github.com/${repo.owner}/${repo.name}`,
      }));
    }),

  /**
   * Get user repositories for scrolling - Logged-in users
   * Uses 5-minute cache to avoid slow GitHub API calls
   * FAST: Returns cached data (instant) or fetches from GitHub (1.8s)
   */
  getReposForScrollingWithUser: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { db } = await import('@/db');
        const { cachedRepos } = await import('@/db/schema');
        const { eq, and, sql } = await import('drizzle-orm');

        const userId = ctx.session?.user?.id;
        if (!userId) {
          // No user session, return empty array
          return [];
        }

        const cacheThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

        // Try cache first (FAST: ~10ms)
        const cached = await db
          .select()
          .from(cachedRepos)
          .where(and(
            eq(cachedRepos.userId, userId),
            sql`${cachedRepos.lastFetched} > ${cacheThreshold}`
          ))
          .limit(input.limit);

        if (cached.length > 0) {
          console.log(`✅ Returned ${cached.length} user repos from cache (instant)`);
          return cached.map(r => ({
            owner: r.owner,
            name: r.name,
            description: r.description || undefined,
            stargazersCount: r.stargazersCount,
            forksCount: r.forksCount,
            language: r.language || undefined,
            topics: r.topics || [],
            url: `https://github.com/${r.owner}/${r.name}`,
          }));
        }

        // Cache miss: fetch from GitHub API (SLOW: ~1.8s)
        console.log(`🐢 Cache miss - fetching user repos from GitHub API...`);
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const userRepos = await githubService.getUserRepositories(undefined, input.limit);

        // Update cache for next time
        for (const repo of userRepos) {
          await db
            .insert(cachedRepos)
            .values({
              owner: repo.owner,
              name: repo.name,
              description: repo.description,
              stargazersCount: repo.stargazersCount,
              forksCount: repo.forksCount,
              language: repo.language,
              topics: repo.topics,
              userId,
              lastFetched: new Date(),
            })
            .onConflictDoUpdate({
              target: [cachedRepos.owner, cachedRepos.name, cachedRepos.userId],
              set: {
                description: repo.description,
                stargazersCount: repo.stargazersCount,
                forksCount: repo.forksCount,
                language: repo.language,
                topics: repo.topics,
                lastFetched: new Date(),
              },
            });
        }

        return userRepos;
      } catch (error: unknown) {
        const errorMessage = parseError(error);
        console.error('Failed to get user repos:', errorMessage);
        return [];
      }
    }),

  /**
   * Get sponsor repositories
   * Returns hardcoded sponsor repos from CACHED_REPOS
   * FAST: No API calls, no DB queries
   */
  getSponsorRepos: publicProcedure
    .query(async () => {
      const sponsorRepos = CACHED_REPOS.filter(repo => repo.sponsor);

      return sponsorRepos.map(repo => ({
        owner: repo.owner,
        name: repo.name,
        description: undefined,
        stargazersCount: 0,
        forksCount: 0,
        language: undefined,
        topics: [],
        url: `https://github.com/${repo.owner}/${repo.name}`,
        isSponsor: true as const,
      }));
    }),

  /**
   * Get installation repositories
   * For users with GitHub App installed
   */
  getInstallationRepositories: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input, ctx }) => {
      try {
        const { db } = await import('@/db');
        const { account, installationRepositories } = await import('@/db/schema');
        const { and, eq } = await import('drizzle-orm');

        // Get the user's linked installationId
        const userAccount = await db.query.account.findFirst({
          where: and(
            eq(account.userId, ctx.user.id),
            eq(account.providerId, 'github')
          ),
        });

        const installationId = userAccount?.installationId;
        if (!installationId) return [];

        // Query installationRepositories for this installation
        const repos = await db.query.installationRepositories.findMany({
          where: eq(installationRepositories.installationId, installationId),
          limit: input.limit,
        });

        // Map to { owner, name, repositoryId }
        return repos.map(r => {
          const [owner, name] = r.fullName.split('/');
          return { owner, name, repositoryId: r.repositoryId };
        });
      } catch (error) {
        console.error('Failed to get installation repos:', error);
        return [];
      }
    }),

  /**
   * Get user repo names (for checking ownership)
   */
  getUserRepoNames: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const userRepos = await githubService.getUserRepositories(undefined, 100);
        return userRepos.map(repo => `${repo.owner}/${repo.name}`);
      } catch (error) {
        console.error('Failed to get user repo names:', error);
        return [];
      }
    }),

  /**
   * Check if user has starred a repo
   */
  hasStarredRepo: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const hasStarred = await githubService.hasStarredRepo(input.owner, input.repo);
        return { hasStarred };
      } catch (error) {
        console.error('Failed to check if repo is starred:', error);
        return { hasStarred: false };
      }
    }),
});
