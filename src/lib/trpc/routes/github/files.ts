import { router, publicProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubService, DEFAULT_MAX_FILES, GitHubFilesResponse } from '@/lib/github';
import { TRPCError } from '@trpc/server';

export const filesRouter = router({
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
        const githubService = await createGitHubService(ctx.session);
        
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
        const githubService = await createGitHubService(ctx.session);
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

  getBranches: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubService(ctx.session);
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

  getRepoMeta: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubService(ctx.session);
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
          message: 'Failed to get repository meta',
        });
      }
    }),
}); 