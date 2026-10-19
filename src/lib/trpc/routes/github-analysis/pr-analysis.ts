import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { createGitHubServiceForRepo } from '@/lib/github';
import { analyzePullRequest } from '@/lib/ai/pr-analysis';
import { GEMINI_PRO_MODEL_NAME } from '@/lib/ai/models';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { tokenUsage, prAnalysisCache } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { checkMonthlyTokenQuota } from '@/lib/ai/monthly-quota';
import { checkPaidAIRateLimit } from '@/lib/rate-limit';
import { checkStargazerPerk } from '@/lib/utils/stargazer-perk';
import { finishStargazerPerk, type StargazerPerkReservation } from '@/lib/utils/stargazer-reservation';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';

export const githubAnalysisPrAnalysisRouter = router({
  // Analyze a PR
  analyzePR: protectedProcedure
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
        yield {
          type: 'progress' as const,
          progress: 0,
          message: 'Starting PR analysis...',
        };

        // Check for active subscription
        const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);

        let effectivePlan = plan;
        let isStargazerPerk = false;

        // If no active subscription, check for stargazer perk
        if (!subscription || subscription.status !== 'active') {
          const perkResult = await checkStargazerPerk(ctx.user.id, ctx.session, 'pr_analysis', plan);

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

        yield {
          type: 'progress' as const,
          progress: 3,
          message: 'Authenticating with GitHub...',
        };

        const githubService = await createGitHubServiceForRepo(owner, repo, ctx.session);
        const repoInfo = await githubService.getRepositoryInfo(owner, repo);

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

        yield {
          type: 'progress' as const,
          progress: 30,
          message: 'Analyzing code quality...',
        };

        const analysisResult = await analyzePullRequest({
          apiKey: keyInfo.apiKey,
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
          progress: 70,
          message: 'Analyzing security and performance...',
        };

        yield {
          type: 'progress' as const,
          progress: 85,
          message: 'Generating recommendations...',
        };

        yield {
          type: 'progress' as const,
          progress: 95,
          message: 'Saving results...',
        };

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

        const currentRepository = await getAccessibleRepositoryInfo(owner, repo, ctx.session);
        if (!currentRepository) throw new Error('Repository access could not be verified before saving');
        const isPrivate = repoInfo.private || currentRepository.private;

        // Cache the analysis
        try {
          await db.insert(prAnalysisCache).values({
            userId: ctx.user.id,
            repoOwner: owner,
            repoName: repo,
            prNumber: number,
            version: nextVersion,
            isPrivate,
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
          if (isStargazerPerk) throw cacheError;
        }

        // Record the persisted analysis before consuming its free use.
        try {
          await db.insert(tokenUsage).values({
            userId: ctx.user.id,
            feature: 'pr_analysis',
            repoOwner: owner,
            repoName: repo,
            model: GEMINI_PRO_MODEL_NAME,
            inputTokens: analysisResult.usage.inputTokens,
            outputTokens: analysisResult.usage.outputTokens,
            totalTokens: analysisResult.usage.totalTokens,
            isByok: keyInfo.isByok,
          });
        } catch (dbError) {
          console.error('Failed to log token usage for PR analysis:', dbError);
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
