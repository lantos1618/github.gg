import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/trpc';
import { createPublicGitHubService } from '@/lib/github';
import { analyzePullRequest } from '@/lib/ai/pr-analysis';
import { analyzeIssue } from '@/lib/ai/issue-analysis';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { tokenUsage, prAnalysisCache, issueAnalysisCache } from '@/db/schema';
import { desc, and, eq } from 'drizzle-orm';

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

  // Analyze a PR
  analyzePR: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
    }))
    .subscription(async function* ({ input, ctx }) {
      const { owner, repo, number } = input;
      const githubService = createPublicGitHubService();

      try {
        // Yield initial progress
        yield {
          type: 'progress' as const,
          progress: 0,
          message: 'Starting PR analysis...',
        };

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

        // Yield progress after fetching PR data
        yield {
          type: 'progress' as const,
          progress: 10,
          message: 'Fetched PR data, analyzing...',
        };

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

        // Yield progress after analysis
        yield {
          type: 'progress' as const,
          progress: 80,
          message: 'Analysis complete, saving results...',
        };

        // Log token usage
        try {
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
          });
        } catch (dbError) {
          console.error('Failed to log token usage for PR analysis:', dbError);
          // Don't fail the entire request if token logging fails
        }

        // Get the latest version for this PR
        const latestAnalysis = await db
          .select()
          .from(prAnalysisCache)
          .where(
            and(
              eq(prAnalysisCache.userId, ctx.user.id),
              eq(prAnalysisCache.repoOwner, owner),
              eq(prAnalysisCache.repoName, repo),
              eq(prAnalysisCache.prNumber, number)
            )
          )
          .orderBy(desc(prAnalysisCache.version))
          .limit(1);

        const nextVersion = latestAnalysis.length > 0 ? latestAnalysis[0].version + 1 : 1;

        // Cache the analysis
        try {
          await db.insert(prAnalysisCache).values({
            userId: ctx.user.id,
            repoOwner: owner,
            repoName: repo,
            prNumber: number,
            version: nextVersion,
            overallScore: analysisResult.analysis.overallScore,
            analysis: analysisResult.analysis,
            markdown: analysisResult.markdown,
            prSnapshot: {
              title: pr.data.title,
              baseBranch: pr.data.base.ref,
              headBranch: pr.data.head.ref,
              additions: pr.data.additions || 0,
              deletions: pr.data.deletions || 0,
              changedFiles: pr.data.changed_files || 0,
            },
          });
        } catch (cacheError) {
          console.error('Failed to cache PR analysis:', cacheError);
          // Don't fail the entire request if caching fails
        }

        // Yield complete result
        yield {
          type: 'complete' as const,
          analysis: analysisResult.analysis,
          markdown: analysisResult.markdown,
          version: nextVersion,
        };
      } catch (error) {
        console.error('PR analysis error:', error);

        // Yield error before throwing
        yield {
          type: 'error' as const,
          message: `Failed to analyze PR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };

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
    .subscription(async function* ({ input, ctx }) {
      const { owner, repo, number } = input;
      const githubService = createPublicGitHubService();

      try {
        // Yield initial progress
        yield { type: 'progress' as const, progress: 0 };

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

        // Yield progress after fetching data
        yield { type: 'progress' as const, progress: 10 };

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

        // Yield progress after analysis
        yield { type: 'progress' as const, progress: 80 };

        // Log token usage
        try {
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
          });
        } catch (dbError) {
          console.error('Failed to log token usage for issue analysis:', dbError);
          // Don't fail the entire request if token logging fails
        }

        // Get the latest version for this issue
        const latestAnalysis = await db
          .select()
          .from(issueAnalysisCache)
          .where(
            and(
              eq(issueAnalysisCache.userId, ctx.user.id),
              eq(issueAnalysisCache.repoOwner, owner),
              eq(issueAnalysisCache.repoName, repo),
              eq(issueAnalysisCache.issueNumber, number)
            )
          )
          .orderBy(desc(issueAnalysisCache.version))
          .limit(1);

        const nextVersion = latestAnalysis.length > 0 ? latestAnalysis[0].version + 1 : 1;

        // Cache the analysis
        try {
          await db.insert(issueAnalysisCache).values({
            userId: ctx.user.id,
            repoOwner: owner,
            repoName: repo,
            issueNumber: number,
            version: nextVersion,
            overallScore: analysisResult.analysis.overallScore,
            slopRanking: analysisResult.analysis.slopRanking,
            suggestedPriority: analysisResult.analysis.suggestedPriority,
            analysis: analysisResult.analysis,
            markdown: analysisResult.markdown,
            issueSnapshot: {
              title: issue.data.title,
              state: issue.data.state,
              comments: issue.data.comments,
              labels: issue.data.labels.map(l => typeof l === 'string' ? l : l.name || ''),
            },
          });
        } catch (cacheError) {
          console.error('Failed to cache issue analysis:', cacheError);
          // Don't fail the entire request if caching fails
        }

        // Yield complete result
        yield {
          type: 'complete' as const,
          analysis: analysisResult.analysis,
          markdown: analysisResult.markdown,
          version: nextVersion,
        };
      } catch (error) {
        console.error('Issue analysis error:', error);

        // Yield error before throwing
        yield {
          type: 'error' as const,
          message: `Failed to analyze issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to analyze issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get cached PR analysis (public endpoint)
  getCachedPRAnalysis: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
      version: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, number, version } = input;

      try {
        const conditions = [
          eq(prAnalysisCache.repoOwner, owner),
          eq(prAnalysisCache.repoName, repo),
          eq(prAnalysisCache.prNumber, number),
        ];

        if (version !== undefined) {
          conditions.push(eq(prAnalysisCache.version, version));
        }

        const baseQuery = db
          .select()
          .from(prAnalysisCache)
          .where(and(...conditions));

        const result = version === undefined
          ? await baseQuery.orderBy(desc(prAnalysisCache.version)).limit(1)
          : await baseQuery;

        if (result.length === 0) {
          return null;
        }

        return result[0];
      } catch (error) {
        console.error('Failed to fetch cached PR analysis:', error);
        return null;
      }
    }),

  // Get cached issue analysis (public endpoint)
  getCachedIssueAnalysis: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      number: z.number(),
      version: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, number, version } = input;

      try {
        const conditions = [
          eq(issueAnalysisCache.repoOwner, owner),
          eq(issueAnalysisCache.repoName, repo),
          eq(issueAnalysisCache.issueNumber, number),
        ];

        if (version !== undefined) {
          conditions.push(eq(issueAnalysisCache.version, version));
        }

        const baseQuery = db
          .select()
          .from(issueAnalysisCache)
          .where(and(...conditions));

        const result = version === undefined
          ? await baseQuery.orderBy(desc(issueAnalysisCache.version)).limit(1)
          : await baseQuery;

        if (result.length === 0) {
          return null;
        }

        return result[0];
      } catch (error) {
        console.error('Failed to fetch cached issue analysis:', error);
        return null;
      }
    }),
});
