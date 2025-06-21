import { router, publicProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubService, DEFAULT_MAX_FILES, GitHubFilesResponse } from '@/lib/github';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { cachedRepos } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { POPULAR_REPOS } from '@/lib/constants';

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
        const now = new Date();
        const cacheThreshold = new Date(now.getTime() - CACHE_DURATION);

        // Get cached repos that are not stale
        const cachedReposData = await db
          .select()
          .from(cachedRepos)
          .where(lt(cachedRepos.lastFetched, cacheThreshold))
          .limit(input.limit);

        // If we have enough fresh cached data, return it
        if (cachedReposData.length >= input.limit) {
          return cachedReposData.map(repo => ({
            owner: repo.owner,
            name: repo.name,
            description: repo.description,
            stargazersCount: repo.stargazersCount,
            forksCount: repo.forksCount,
            language: repo.language,
            topics: repo.topics,
            url: `https://github.com/${repo.owner}/${repo.name}`,
          }));
        }

        // Otherwise, fetch fresh data
        const repos: {owner: string, name: string}[] = [];

        // If user is authenticated, get their repos
        if (ctx.session?.user?.id) {
          try {
            const userRepos = await githubService.getUserRepositories();
            // Take up to half of the limit from user repos
            repos.push(...userRepos.slice(0, Math.floor(input.limit / 2)));
          } catch (error) {
            console.warn('Failed to fetch user repos, falling back to popular repos only');
          }
        }

        // Fill remaining slots with popular repos from constants
        if (repos.length < input.limit) {
          const remainingSlots = input.limit - repos.length;
          const popularReposToUse = POPULAR_REPOS.slice(0, remainingSlots);
          repos.push(...popularReposToUse);
        }
        
        // Fetch detailed info for all repos
        const reposWithDetails = await Promise.all(
          repos.map(async (repo) => {
            try {
              const details = await githubService.getRepositoryDetails(repo.owner, repo.name);
              const userId = ctx.session?.user?.id ?? null;
              
              // Cache the repo details
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
                  isUserRepo: !!userId && (await githubService.getUserRepositories()).some(r => r.owner === details.owner && r.name === details.name),
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

              return details;
            } catch (error) {
              console.warn(`Failed to fetch details for ${repo.owner}/${repo.name}:`, error);
              // Return basic info if detailed fetch fails
              return {
                owner: repo.owner,
                name: repo.name,
                description: 'Could not fetch details',
                stargazersCount: 0,
                forksCount: 0,
              };
            }
          })
        );
        
        return reposWithDetails.filter(Boolean);

      } catch (error: unknown) {
        console.error('Failed to get repos for scrolling:', error);
        
        // Return basic popular repos as fallback
        return POPULAR_REPOS.slice(0, input.limit).map(repo => ({
          owner: repo.owner,
          name: repo.name,
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