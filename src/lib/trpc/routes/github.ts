import { router, publicProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubService, DEFAULT_MAX_FILES, GitHubFilesResponse } from '@/lib/github';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { cachedRepos } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { POPULAR_REPOS } from '@/lib/constants';
import { shuffleArray } from '@/lib/utils';

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

    // Get repositories for ScrollingRepos component with caching
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
            userRepos.forEach(repo => {
              const key = `${repo.owner}/${repo.name}`;
              if (!repoIdentifiers.has(key)) {
                repoIdentifiers.set(key, { ...repo, special: POPULAR_REPOS.find(p => p.owner === repo.owner && p.name === repo.name)?.special });
              }
            });
          } catch (error) {
            console.warn('Failed to fetch user repos, continuing with popular repos.');
          }
        }

        // Shuffle all popular repos
        const allPopularRepos = shuffleArray(POPULAR_REPOS);

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
        
        const reposFromCache: any[] = [];
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
        const fetchedReposWithDetails = await Promise.all(
          reposToFetch.map(async (repo) => {
            try {
              const details = await githubService.getRepositoryDetails(repo.owner, repo.name);
              const userId = ctx.session?.user?.id ?? null;
              
              // Cache the new details
              await db.insert(cachedRepos).values({
                owner: details.owner,
                name: details.name,
                description: details.description,
                stargazersCount: details.stargazersCount,
                forksCount: details.forksCount,
                language: details.language,
                topics: details.topics,
                isUserRepo: !!userId,
                userId: userId,
                lastFetched: new Date(),
              }).onConflictDoUpdate({
                target: [cachedRepos.owner, cachedRepos.name],
                set: {
                  description: details.description,
                  stargazersCount: details.stargazersCount,
                  forksCount: details.forksCount,
                  language: details.language,
                  topics: details.topics,
                  lastFetched: new Date(),
                },
              });

              return { ...details, special: repo.special };
            } catch (error) {
              console.warn(`Failed to fetch details for ${repo.owner}/${repo.name}:`, error);
              return null;
            }
          })
        );
        
        // 5. Combine and sort
        const combinedRepos = [...reposFromCache, ...fetchedReposWithDetails.filter(Boolean)];
        
        const finalRepoMap = new Map(combinedRepos.map(r => [`${r.owner}/${r.name}`, r]));
        const sortedRepos = targetRepoList
          .map(repo => finalRepoMap.get(`${repo.owner}/${repo.name}`))
          .filter(Boolean);

        return sortedRepos;

      } catch (error: unknown) {
        console.error('Failed to get repos for scrolling:', error);
        
        // Fallback to basic popular repos
        return POPULAR_REPOS.slice(0, input.limit).map(repo => ({
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
            isUserRepo: !!userId,
            userId: userId,
            lastFetched: new Date(),
          })
          .onConflictDoUpdate({
            target: [cachedRepos.owner, cachedRepos.name],
            set: {
              description: details.description,
              stargazersCount: details.stargazersCount,
              forksCount: details.forksCount,
              language: details.language,
              topics: details.topics,
              lastFetched: new Date(),
            },
          });

        return { ...details, userId };
      } catch (error: unknown) {
        console.error('Failed to refresh repo cache:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refresh repository cache',
        });
      }
    }),
}); 