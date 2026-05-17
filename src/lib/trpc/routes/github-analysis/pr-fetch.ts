import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { createPublicGitHubService } from '@/lib/github';
import { TRPCError } from '@trpc/server';

export const githubAnalysisPrFetchRouter = router({
  // Get all PRs for a repository
  getRepoPRs: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional().default('open'),
    }))
    .query(async ({ input }) => {
      const { owner, repo, state } = input;
      const githubService = createPublicGitHubService();

      try {
        const response = await githubService['octokit'].pulls.list({
          owner,
          repo,
          state,
          per_page: 100,
          sort: 'updated',
          direction: 'desc',
        });

        return response.data.map(pr => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          user: pr.user?.login || 'unknown',
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          additions: 0, // Not available in list endpoint
          deletions: 0, // Not available in list endpoint
          changedFiles: 0, // Not available in list endpoint
          labels: pr.labels.map(l => typeof l === 'string' ? l : l.name || ''),
          draft: pr.draft,
        }));
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch PRs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get single PR details
  getPRDetails: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, number } = input;
      const githubService = createPublicGitHubService();

      try {
        const [pr, files] = await Promise.all([
          githubService['octokit'].pulls.get({
            owner,
            repo,
            pull_number: number,
          }),
          githubService['octokit'].pulls.listFiles({
            owner,
            repo,
            pull_number: number,
            per_page: 100,
          }),
        ]);

        return {
          number: pr.data.number,
          title: pr.data.title,
          body: pr.data.body || '',
          state: pr.data.state,
          user: pr.data.user?.login || 'unknown',
          createdAt: pr.data.created_at,
          updatedAt: pr.data.updated_at,
          mergedAt: pr.data.merged_at,
          additions: pr.data.additions || 0,
          deletions: pr.data.deletions || 0,
          changedFiles: pr.data.changed_files || 0,
          labels: pr.data.labels.map(l => typeof l === 'string' ? l : l.name || ''),
          draft: pr.data.draft,
          baseBranch: pr.data.base.ref,
          headBranch: pr.data.head.ref,
          files: files.data.map(f => ({
            filename: f.filename,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
            patch: f.patch,
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch PR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});
