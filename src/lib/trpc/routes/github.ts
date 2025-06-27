import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubService, DEFAULT_MAX_FILES, GitHubFilesResponse, RepoSummary } from '@/lib/github';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { cachedRepos } from '@/db/schema';
import { CACHED_REPOS } from '@/lib/constants';
import { shuffleArray } from '@/lib/utils';
import { eq, sql } from 'drizzle-orm';
import { user } from '@/db/schema';

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export const githubRouter = router({
  // Get repository files from tarball (requires GitHub authentication)
  files: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      ref: z.string().optional(),
      path: z.string().optional(),
      maxFiles: z.number().min(1).max(1000).default(DEFAULT_MAX_FILES), // Limit to prevent abuse
    }))
    .query(async ({ input, ctx }): Promise<GitHubFilesResponse> => {
      try {
        const githubService = await createGitHubService(ctx.session, ctx.req);
        
        const result = await githubService.getRepositoryFiles(
          input.owner,
          input.repo,
          input.ref,
          input.maxFiles,
          input.path
        );

        return result;
      } catch (error: unknown) {
        console.error('GitHub files query error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Provide specific error messages based on the error type
        if (errorMessage?.includes('token is invalid or expired')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub token is invalid or expired. Please check your authentication.',
          });
        }
        
        if (errorMessage?.includes('Repository') && errorMessage?.includes('not found')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: errorMessage,
          });
        }
        
        if (errorMessage?.includes('Branch or tag')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: errorMessage,
          });
        }
        
        // Generic error for other cases
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: errorMessage || 'Failed to extract repository files',
        });
      }
    }),

    getRepoInfo: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubService(ctx.session, ctx.req);
        const repoInfo = await githubService.getRepositoryInfo(input.owner, input.repo);
        return repoInfo;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('not found')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: errorMessage,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get repository info',
        });
      }
    }),

    // Get cached repositories for immediate ScrollingRepos rendering
    getReposForScrollingCached: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(64), // 8 rows * 8 items
    }))
    .query(async ({ input }): Promise<RepoSummary[]> => {
      try {
        // Fetch a random sample of global/public cached repos only
        const sampledCachedRepos = await db
          .select()
          .from(cachedRepos)
          .where(sql`${cachedRepos.userId} IS NULL`)
          .orderBy(sql`RANDOM()`)
          .limit(input.limit * 2); // Fetch double the required limit to ensure a good shuffle pool

        // Create a quick lookup map for special repositories.
        const specialReposMap = new Map(
          CACHED_REPOS.filter(p => p.special).map(p => [`${p.owner}/${p.name}`, true])
        );

        // Add the 'special' flag to the sampled repos.
        const reposWithSpecial = sampledCachedRepos.map(repo => ({
          ...repo,
          special: specialReposMap.has(`${repo.owner}/${repo.name}`)
        }));

        // Shuffle the sampled list and return the requested number of repos.
        const shuffled = shuffleArray(reposWithSpecial).slice(0, input.limit);
        if (shuffled.length === 0) {
          // Fallback: return CACHED_REPOS if cache is empty, mapping to RepoSummary shape
          return CACHED_REPOS.slice(0, input.limit).map(repo => ({
            ...repo,
            description: '',
            stargazersCount: 0,
            forksCount: 0,
            language: '',
            topics: [],
            special: repo.special || false,
            sponsor: repo.sponsor || false,
          }));
        }
        return shuffled;

      } catch (error: unknown) {
        console.error('Failed to get cached repos for scrolling:', error);
        return [];
      }
    }),

    // Get user repositories and sprinkle them into the scrolling grid
    getReposForScrollingWithUser: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(10), // Limit user repos
    }))
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;

        const githubService = await createGitHubService(ctx.session, ctx.req);
        
        // Get user repos
        const userRepos = await githubService.getUserRepositories();
        const limitedUserRepos = userRepos.slice(0, input.limit);

        // Check cache for user repos (filter by userId)
        const now = new Date();
        const cacheThreshold = new Date(now.getTime() - CACHE_DURATION);
        const allCachedRepos = await db.select().from(cachedRepos).where(eq(cachedRepos.userId, userId));
        const cachedReposMap = new Map(allCachedRepos.map(r => [`${r.owner}/${r.name}`, r]));

        const userReposWithDetails = await Promise.allSettled(
          limitedUserRepos.map(async (repo) => {
            const cached = cachedReposMap.get(`${repo.owner}/${repo.name}`);
            
            if (cached && cached.lastFetched > cacheThreshold) {
              // Use cached data
              return { ...cached, isUserRepo: true };
            }

            try {
              // Fetch fresh data
              const details = await githubService.getRepositoryDetails(repo.owner, repo.name);
              
              // Cache the new details (upsert by owner, name, and userId)
              await db.insert(cachedRepos).values({
                owner: details.owner,
                name: details.name,
                description: details.description,
                stargazersCount: details.stargazersCount,
                forksCount: details.forksCount,
                language: details.language,
                topics: details.topics,
                userId: userId,
                lastFetched: new Date(),
              }).onConflictDoUpdate({
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

              return { ...details, isUserRepo: true };
            } catch (error) {
              console.warn(`Failed to fetch details for user repo ${repo.owner}/${repo.name}:`, error);
              return null;
            }
          })
        );

        return userReposWithDetails
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => (result as PromiseFulfilledResult<RepoSummary>).value);

      } catch (error: unknown) {
        console.error('Failed to get user repos for scrolling:', error);
        return [];
      }
    }),

    // Legacy procedure - keeping for backward compatibility
    getReposForScrolling: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(64), // 8 rows * 8 items
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubService(ctx.session, ctx.req);
        
        // 1. Build a definitive list of repo identifiers
        const repoIdentifiers = new Map<string, { owner: string; name: string; special?: boolean }>();

        // If user is authenticated, add their repos first to prioritize them
        let userRepos: { owner: string; name: string }[] = [];
        if (ctx.session?.user?.id) {
          try {
            userRepos = await githubService.getUserRepositories();
            // Limit user repos to 6 (most recent/relevant)
            const limitedUserRepos = userRepos.slice(0, 6);
            limitedUserRepos.forEach(repo => {
              const key = `${repo.owner}/${repo.name}`;
              if (!repoIdentifiers.has(key)) {
                repoIdentifiers.set(key, { ...repo, special: CACHED_REPOS.find(p => p.owner === repo.owner && p.name === repo.name)?.special });
              }
            });
          } catch (error) {
            console.warn('Failed to fetch user repos, continuing with popular repos.', error);
          }
        }

        // Shuffle all popular repos
        const allPopularRepos = shuffleArray(CACHED_REPOS);

        // Add popular repos until the limit is reached, avoiding duplicates
        allPopularRepos.forEach(repo => {
          if (repoIdentifiers.size < input.limit) {
            const key = `${repo.owner}/${repo.name}`;
            if (!repoIdentifiers.has(key)) {
              repoIdentifiers.set(key, repo);
            }
          }
        });
        
        const targetRepoList = Array.from(repoIdentifiers.values());

        // 2. Get cached data
        const now = new Date();
        const cacheThreshold = new Date(now.getTime() - CACHE_DURATION);
        const allCachedRepos = await db.select().from(cachedRepos);
        const cachedReposMap = new Map(allCachedRepos.map(r => [`${r.owner}/${r.name}`, r]));
        
        const reposFromCache: RepoSummary[] = [];
        const reposToFetch: { owner: string; name: string; special?: boolean }[] = [];

        // 3. Differentiate between cached and to-be-fetched repos
        targetRepoList.forEach(repo => {
          const cached = cachedReposMap.get(`${repo.owner}/${repo.name}`);
          if (cached && cached.lastFetched > cacheThreshold) {
            reposFromCache.push({ ...cached, special: repo.special });
          } else {
            reposToFetch.push(repo);
          }
        });

        // 4. Fetch details for non-cached repos
        const fetchedReposWithDetails = await Promise.allSettled(
          reposToFetch.map(async (repo) => {
            try {
              const details = await githubService.getRepositoryDetails(repo.owner, repo.name);
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
              
              // Cache the new details with proper error handling
              try {
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
              } catch (dbError) {
                console.warn(`Failed to cache repo ${repo.owner}/${repo.name}:`, dbError);
              }

              return { ...details, special: repo.special };
            } catch (error) {
              console.warn(`Failed to fetch details for ${repo.owner}/${repo.name}:`, error);
              return null;
            }
          })
        );
        
        // 5. Combine and sort
        const validFetchedRepos = fetchedReposWithDetails
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => (result as PromiseFulfilledResult<RepoSummary>).value);
        const combinedRepos = [...reposFromCache, ...validFetchedRepos];
        
        const finalRepoMap = new Map(combinedRepos.map(r => [`${r.owner}/${r.name}`, r]));
        const sortedRepos = targetRepoList
          .map(repo => finalRepoMap.get(`${repo.owner}/${repo.name}`))
          .filter(Boolean) as RepoSummary[];

        return sortedRepos;

      } catch (error: unknown) {
        console.error('Failed to get repos for scrolling:', error);
        
        // Fallback to basic popular repos
        return CACHED_REPOS.slice(0, input.limit).map(repo => ({
          ...repo,
          description: 'Could not fetch details',
          stargazersCount: 0,
          forksCount: 0,
        }));
      }
    }),

    // Force refresh cache for a specific repo
    refreshRepoCache: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubService(ctx.session, ctx.req);
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
        console.error('Failed to refresh repo cache:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refresh repository cache',
        });
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
        console.error('Failed to check cache status:', error);
        return { needsRefresh: false, totalCached: 0, staleCount: 0, oldestCache: null };
      }
    }),

    // Get Sponsor repositories
    getSponsorRepos: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const githubService = await createGitHubService(ctx.session, ctx.req);
        
        const sponsorDetails = await Promise.allSettled(
          CACHED_REPOS.filter(repo => repo.sponsor).map(repo => 
            githubService.getRepositoryDetails(repo.owner, repo.name)
          )
        );
        
        return sponsorDetails
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => ({ 
            ...(result as PromiseFulfilledResult<RepoSummary>).value, 
            isSponsor: true 
          }));

      } catch (error) {
        console.error('Failed to get sponsor repos:', error);
        return [];
      }
    }),

    getUserRepoNames: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const githubService = await createGitHubService(ctx.session, ctx.req);
        const userRepos = await githubService.getUserRepositories(); 
        return userRepos.map(repo => `${repo.owner}/${repo.name}`);
      } catch (error) {
        console.error('Failed to get user repo names:', error);
        return [];
      }
    }),

    getBranches: publicProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          const githubService = await createGitHubService(ctx.session, ctx.req);
          const branches = await githubService.getBranches(input.owner, input.repo);
          return branches;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (errorMessage.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: errorMessage,
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to get branches',
          });
        }
      }),
}); 