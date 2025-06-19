import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubService, DEFAULT_MAX_FILES, GitHubFilesResponse } from '@/lib/github';
import { auth } from '@/lib/auth';
import { TRPCError } from '@trpc/server';

export const githubRouter = router({
  // Get repository files from tarball (requires GitHub authentication)
  files: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      ref: z.string().optional(),
      maxFiles: z.number().min(1).max(1000).default(DEFAULT_MAX_FILES), // Limit to prevent abuse
    }))
    .query(async ({ input, ctx }): Promise<GitHubFilesResponse> => {
      try {
        const githubService = await createGitHubService(ctx.session, ctx.req);
        
        const result = await githubService.getRepositoryFiles(
          input.owner,
          input.repo,
          input.ref,
          input.maxFiles
        );

        return result;
      } catch (error: any) {
        console.error('GitHub files query error:', error);
        
        // Provide specific error messages based on the error type
        if (error.message?.includes('token is invalid or expired')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub token is invalid or expired. Please check your authentication.',
          });
        }
        
        if (error.message?.includes('Repository') && error.message?.includes('not found')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        
        if (error.message?.includes('Branch or tag')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        
        // Generic error for other cases
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to extract repository files',
        });
      }
    }),
}); 