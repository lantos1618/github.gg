import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceFromSession } from '@/lib/github';
import { fetchFilesByPaths } from '@/lib/github/file-fetcher';

export const refactorRouter = router({
  analyzeRepo: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional(),
      filePaths: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Create authenticated GitHub service
        const githubService = await createGitHubServiceFromSession(ctx.session);

        // Fetch repo info to get actual default branch if not provided
        let ref = input.ref;
        if (!ref || ref === 'main') {
          const repoInfo = await githubService.getRepositoryInfo(input.user, input.repo);
          ref = repoInfo.default_branch || 'main';
        }

        // Fetch file contents from GitHub
        const files = await fetchFilesByPaths(input.user, input.repo, input.filePaths, githubService, ref);

        if (!files || files.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to fetch any files from GitHub. Please check the repository and file paths.',
          });
        }

        // TODO: Implement actual refactor analysis
        // For now, return a simple analysis
        const analysis = {
          suggestions: [],
          stats: {
            total: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
        };

        return {
          analysis,
          filesAnalyzed: files.length,
        };
      } catch (error) {
        console.error('Failed to analyze repo:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze repository',
        });
      }
    }),
});
