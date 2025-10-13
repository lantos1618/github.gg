import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/trpc';
import { createPublicGitHubService, createGitHubServiceForUserOperations } from '@/lib/github';
import { analyzePullRequest } from '@/lib/ai/pr-analysis';
import { analyzeCommit } from '@/lib/ai/commit-analysis';
import { analyzeIssue } from '@/lib/ai/issue-analysis';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { tokenUsage } from '@/db/schema';

export const githubAnalysisRouter = router({
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
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changedFiles: pr.changed_files || 0,
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

  // Analyze a PR
  analyzePR: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
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
            per_page: 30,
          }),
        ]);

        const analysisResult = await analyzePullRequest({
          prTitle: pr.data.title,
          prDescription: pr.data.body || '',
          changedFiles: files.data.slice(0, 20).map(f => ({
            filename: f.filename,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
            patch: f.patch,
          })),
          repoName: `${owner}/${repo}`,
          baseBranch: pr.data.base.ref,
          headBranch: pr.data.head.ref,
        });

        // Log token usage
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'pr_analysis',
          repoOwner: owner,
          repoName: repo,
          model: 'gemini-2.5-pro',
          inputTokens: analysisResult.usage.inputTokens,
          outputTokens: analysisResult.usage.outputTokens,
          totalTokens: analysisResult.usage.totalTokens,
          isByok: false,
          createdAt: new Date(),
        });

        return {
          analysis: analysisResult.analysis,
          markdown: analysisResult.markdown,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to analyze PR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get all issues for a repository
  getRepoIssues: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional().default('open'),
    }))
    .query(async ({ input }) => {
      const { owner, repo, state } = input;
      const githubService = createPublicGitHubService();

      try {
        const response = await githubService['octokit'].issues.listForRepo({
          owner,
          repo,
          state,
          per_page: 100,
          sort: 'updated',
          direction: 'desc',
        });

        // Filter out PRs (GitHub API returns PRs as issues)
        const issues = response.data.filter(issue => !issue.pull_request);

        return issues.map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          user: issue.user?.login || 'unknown',
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          comments: issue.comments,
          labels: issue.labels.map(l => typeof l === 'string' ? l : l.name || ''),
        }));
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get single issue details
  getIssueDetails: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, number } = input;
      const githubService = createPublicGitHubService();

      try {
        const issue = await githubService['octokit'].issues.get({
          owner,
          repo,
          issue_number: number,
        });

        return {
          number: issue.data.number,
          title: issue.data.title,
          body: issue.data.body || '',
          state: issue.data.state,
          user: issue.data.user?.login || 'unknown',
          createdAt: issue.data.created_at,
          updatedAt: issue.data.updated_at,
          closedAt: issue.data.closed_at,
          comments: issue.data.comments,
          labels: issue.data.labels.map(l => typeof l === 'string' ? l : l.name || ''),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Analyze an issue
  analyzeIssueEndpoint: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { owner, repo, number } = input;
      const githubService = createPublicGitHubService();

      try {
        const [issue, repoData] = await Promise.all([
          githubService['octokit'].issues.get({
            owner,
            repo,
            issue_number: number,
          }),
          githubService['octokit'].repos.get({
            owner,
            repo,
          }),
        ]);

        const analysisResult = await analyzeIssue({
          issueTitle: issue.data.title,
          issueBody: issue.data.body || '',
          issueNumber: issue.data.number,
          author: {
            login: issue.data.user?.login || 'unknown',
            type: issue.data.user?.type || 'User',
          },
          labels: issue.data.labels.map(l => typeof l === 'string' ? l : l.name || ''),
          repoName: `${owner}/${repo}`,
          repoDescription: repoData.data.description || undefined,
        });

        // Log token usage
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'issue_analysis',
          repoOwner: owner,
          repoName: repo,
          model: 'gemini-2.5-pro',
          inputTokens: analysisResult.usage.inputTokens,
          outputTokens: analysisResult.usage.outputTokens,
          totalTokens: analysisResult.usage.totalTokens,
          isByok: false,
          createdAt: new Date(),
        });

        return {
          analysis: analysisResult.analysis,
          markdown: analysisResult.markdown,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to analyze issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});
