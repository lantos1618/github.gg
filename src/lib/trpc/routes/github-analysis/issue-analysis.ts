import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/trpc';
import { createGitHubServiceForRepo, createPublicGitHubService } from '@/lib/github';
import { analyzeIssue } from '@/lib/ai/issue-analysis';
import { GEMINI_PRO_MODEL_NAME } from '@/lib/ai/models';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { tokenUsage, issueAnalysisCache } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { checkMonthlyTokenQuota } from '@/lib/ai/monthly-quota';
import { checkPaidAIRateLimit } from '@/lib/rate-limit';
import { checkStargazerPerk } from '@/lib/utils/stargazer-perk';
import { finishStargazerPerk, type StargazerPerkReservation } from '@/lib/utils/stargazer-reservation';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';

export const githubAnalysisIssueAnalysisRouter = router({
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
      let perkReservation: StargazerPerkReservation | undefined;

      try {
        // Yield initial progress
        yield { type: 'progress' as const, progress: 0, message: 'Starting issue analysis...' };

        // Check for active subscription
        const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);

        let effectivePlan = plan;
        let isStargazerPerk = false;

        // If no active subscription, check for stargazer perk
        if (!subscription || subscription.status !== 'active') {
          const perkResult = await checkStargazerPerk(ctx.user.id, ctx.session, 'issue_analysis', plan);

          if (!perkResult.isStargazerPerk) {
            yield { type: 'error' as const, message: perkResult.errorMessage };
            return;
          }

          isStargazerPerk = true;
          effectivePlan = perkResult.effectivePlan;
          perkReservation = perkResult.reservation;
        }

        const keyInfo = await getApiKeyForUser(ctx.user.id, effectivePlan);
        if (!keyInfo) {
          yield { type: 'error' as const, message: 'Please add your Gemini API key in settings to use this feature' };
          return;
        }

        if (!isStargazerPerk) {
          const quota = await checkMonthlyTokenQuota({ userId: ctx.user.id, isByok: keyInfo.isByok });
          if (!quota.allowed) {
            yield { type: 'error' as const, message: quota.message };
            return;
          }
          const rate = await checkPaidAIRateLimit(ctx.user.id);
          if (rate.status !== 'allowed') {
            yield { type: 'error' as const, message: rate.message };
            return;
          }
        }

        yield { type: 'progress' as const, progress: 3, message: 'Authenticating with GitHub...' };

        const githubService = await createGitHubServiceForRepo(owner, repo, ctx.session);

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
        yield { type: 'progress' as const, progress: 15, message: 'Fetched issue data, analyzing...' };

        const analysisResult = await analyzeIssue({
          apiKey: keyInfo.apiKey,
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
        yield { type: 'progress' as const, progress: 70, message: 'Analysis complete, generating recommendations...' };

        yield { type: 'progress' as const, progress: 90, message: 'Saving results...' };

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

        const currentRepository = await getAccessibleRepositoryInfo(owner, repo, ctx.session);
        if (!currentRepository) throw new Error('Repository access could not be verified before saving');
        const isPrivate = repoData.data.private || currentRepository.private;

        // Cache the analysis
        try {
          await db.insert(issueAnalysisCache).values({
            userId: ctx.user.id,
            repoOwner: owner,
            repoName: repo,
            issueNumber: number,
            version: nextVersion,
            isPrivate,
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
          if (isStargazerPerk) throw cacheError;
        }

        // Record the persisted analysis before consuming its free use.
        try {
          await db.insert(tokenUsage).values({
            userId: ctx.user.id,
            feature: 'issue_analysis',
            repoOwner: owner,
            repoName: repo,
            model: GEMINI_PRO_MODEL_NAME,
            inputTokens: analysisResult.usage.inputTokens,
            outputTokens: analysisResult.usage.outputTokens,
            totalTokens: analysisResult.usage.totalTokens,
            isByok: keyInfo.isByok,
          });
        } catch (dbError) {
          console.error('Failed to log token usage for issue analysis:', dbError);
          if (isStargazerPerk) throw dbError;
        }
        if (perkReservation) {
          try {
            await finishStargazerPerk(perkReservation, true);
          } catch (reservationError) {
            console.error('Failed to complete stargazer perk reservation:', reservationError);
          }
          perkReservation = undefined;
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
      } finally {
        if (perkReservation) {
          try {
            await finishStargazerPerk(perkReservation, false);
          } catch (releaseError) {
            console.error('Failed to release stargazer perk reservation:', releaseError);
          }
        }
      }
    }),
});
