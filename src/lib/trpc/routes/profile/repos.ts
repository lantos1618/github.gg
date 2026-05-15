import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { handleTRPCGitHubError } from '@/lib/github/error-handler';

export const profileReposRouter = router({
  getUserRepositories: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const repos = await githubService.getUserRepositories(input.username);

        return repos
          .filter(repo => !repo.fork)
          .map(repo => ({
            name: repo.name,
            description: repo.description || null,
            language: repo.language || null,
            stargazersCount: repo.stargazersCount,
            forksCount: repo.forksCount,
            fork: false,
          }));
      } catch (error) {
        handleTRPCGitHubError(error);
      }
    }),
});
