import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubServiceForUserOperations, RepoSummary } from '@/lib/github';
import { CACHED_REPOS } from '@/lib/constants';
import { shuffleArray } from '@/lib/utils';
import { parseError } from '@/lib/types/errors';
import { Octokit } from '@octokit/rest';

/**
 * Background function to refresh star counts
 * Fetches from GitHub API and updates DB cache
 */
async function refreshStarCountsInBackground() {
  const { db } = await import('@/db');
  const { cachedRepos } = await import('@/db/schema');

  const githubToken = process.env.GITHUB_APP_TOKEN || process.env.GITHUB_TOKEN || process.env.GITHUB_PUBLIC_API_KEY;
  const octokit = new Octokit({ auth: githubToken });

  console.log(`🔄 Refreshing star counts for ${CACHED_REPOS.length} repos...`);

  for (const repo of CACHED_REPOS) {
    try {
      const { data } = await octokit.rest.repos.get({
        owner: repo.owner,
        repo: repo.name,
      });

      await db
        .insert(cachedRepos)
        .values({
          owner: repo.owner,
          name: repo.name,
          description: data.description || undefined,
          stargazersCount: data.stargazers_count,
          forksCount: data.forks_count,
          language: data.language || undefined,
          topics: (data.topics as string[]) || [],
          userId: null,
          lastFetched: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [cachedRepos.owner, cachedRepos.name, cachedRepos.userId],
          set: {
            description: data.description || undefined,
            stargazersCount: data.stargazers_count,
            forksCount: data.forks_count,
            language: data.language || undefined,
            topics: (data.topics as string[]) || [],
            lastFetched: new Date(),
            updatedAt: new Date(),
          },
        });

      console.log(`✅ ${repo.owner}/${repo.name}: ${data.stargazers_count} stars`);
    } catch (error) {
      console.error(`❌ Failed to fetch ${repo.owner}/${repo.name}:`, error);
    }
  }

  console.log('✅ Star count refresh complete');
}

/**
 * ULTRATHINK REPOS ROUTER
 *
 * Philosophy: Keep it simple, fast, and stateless
 * - Anonymous users get shuffled popular repos (instant)
 * - Logged-in users get their repos via 1 fast GitHub API call
 * - Star counts cached in DB, auto-refreshed when stale (6 hours)
 */
export const reposRouter = router({
  /**
   * Get repositories for scrolling - Anonymous users
   * Returns shuffled popular repos with cached star counts from DB
   * FAST: Reads from DB cache (6 hour TTL), triggers background refresh if stale
   */
  getReposForScrollingCached: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(64),
    }))
    .query(async ({ input }): Promise<RepoSummary[]> => {
      try {
        const { db } = await import('@/db');
        const { cachedRepos } = await import('@/db/schema');
        const { sql } = await import('drizzle-orm');

        const cacheThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours

        // Fetch cached data from DB (userId IS NULL = public repos)
        const cached = await db
          .select()
          .from(cachedRepos)
          .where(sql`${cachedRepos.userId} IS NULL`)
          .limit(100);

        // Create a map of cached repos
        const cachedMap = new Map(
          cached.map(r => [`${r.owner}/${r.name}`, r])
        );

        // Check if cache is stale (oldest entry is > 6 hours old)
        const oldestEntry = cached.reduce((oldest, entry) =>
          !oldest || entry.lastFetched < oldest.lastFetched ? entry : oldest
        , cached[0]);

        const isStale = !oldestEntry || oldestEntry.lastFetched < cacheThreshold;

        // If stale, trigger background refresh (don't await)
        if (isStale) {
          console.log('🔄 Cache is stale, triggering background refresh...');
          refreshStarCountsInBackground().catch(err =>
            console.error('Background refresh failed:', err)
          );
        }

        // Merge cached data with CACHED_REPOS
        const enrichedRepos = CACHED_REPOS.map(repo => {
          const repoKey = `${repo.owner}/${repo.name}`;
          const cachedData = cachedMap.get(repoKey);

          return {
            owner: repo.owner,
            name: repo.name,
            description: cachedData?.description || undefined,
            stargazersCount: cachedData?.stargazersCount || repo.stargazersCount || 0,
            forksCount: cachedData?.forksCount || 0,
            language: cachedData?.language || undefined,
            topics: cachedData?.topics || [],
            url: `https://github.com/${repo.owner}/${repo.name}`,
          };
        });

        // Shuffle and return
        const shuffled = shuffleArray(enrichedRepos).slice(0, input.limit);
        return shuffled;
      } catch (error) {
        console.error('Failed to get cached repos:', error);
        // Fallback to hardcoded values
        const shuffled = shuffleArray([...CACHED_REPOS]).slice(0, input.limit);
        return shuffled.map(repo => ({
          owner: repo.owner,
          name: repo.name,
          description: undefined,
          stargazersCount: repo.stargazersCount || 0,
          forksCount: 0,
          language: undefined,
          topics: [],
          url: `https://github.com/${repo.owner}/${repo.name}`,
        }));
      }
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
   * Returns sponsor repos with cached star counts from DB
   * FAST: Reads from DB cache (6 hour TTL)
   */
  getSponsorRepos: publicProcedure
    .query(async () => {
      try {
        const { db } = await import('@/db');
        const { cachedRepos } = await import('@/db/schema');
        const { sql } = await import('drizzle-orm');

        const sponsorRepos = CACHED_REPOS.filter(repo => repo.sponsor);

        // Fetch cached data from DB
        const cached = await db
          .select()
          .from(cachedRepos)
          .where(sql`${cachedRepos.userId} IS NULL`)
          .limit(100);

        const cachedMap = new Map(
          cached.map(r => [`${r.owner}/${r.name}`, r])
        );

        return sponsorRepos.map(repo => {
          const repoKey = `${repo.owner}/${repo.name}`;
          const cachedData = cachedMap.get(repoKey);

          return {
            owner: repo.owner,
            name: repo.name,
            description: cachedData?.description || undefined,
            stargazersCount: cachedData?.stargazersCount || repo.stargazersCount || 0,
            forksCount: cachedData?.forksCount || 0,
            language: cachedData?.language || undefined,
            topics: cachedData?.topics || [],
            url: `https://github.com/${repo.owner}/${repo.name}`,
            isSponsor: true as const,
          };
        });
      } catch (error) {
        console.error('Failed to get sponsor repos:', error);
        const sponsorRepos = CACHED_REPOS.filter(repo => repo.sponsor);
        return sponsorRepos.map(repo => ({
          owner: repo.owner,
          name: repo.name,
          description: undefined,
          stargazersCount: repo.stargazersCount || 0,
          forksCount: 0,
          language: undefined,
          topics: [],
          url: `https://github.com/${repo.owner}/${repo.name}`,
          isSponsor: true as const,
        }));
      }
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
