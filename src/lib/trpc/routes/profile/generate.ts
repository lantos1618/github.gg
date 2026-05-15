import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache, tokenUsage, developerEmails } from '@/db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { generateDeveloperProfileStreaming, findAndStoreDeveloperEmail } from '@/lib/ai/developer-profile';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { checkStargazerPerk } from '@/lib/utils/stargazer-perk';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { isPgErrorWithCode } from '@/lib/db/utils';

export const profileGenerateRouter = router({
  // Check generation status (lock + recent profile)
  checkGenerationStatus: protectedProcedure
    .input(z.object({ username: z.string().min(1, 'Username is required') }))
    .query(async ({ input }) => {
      const normalizedUsername = input.username.toLowerCase();
      const lockKey = `profile:${normalizedUsername}`;

      const recentProfile = await db
        .select()
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername))
        .orderBy(desc(developerProfileCache.version))
        .limit(1);

      const hasRecentProfile = recentProfile.length > 0 &&
        (new Date().getTime() - recentProfile[0].updatedAt.getTime() < 5 * 60 * 1000);

      const { isGenerationInProgress } = await import('@/lib/rate-limit');
      const lockExists = await isGenerationInProgress(lockKey);

      return {
        hasRecentProfile,
        profile: hasRecentProfile ? recentProfile[0].profileData : null,
        lockExists,
        canReconnect: lockExists && !hasRecentProfile,
      };
    }),

  generateProfileMutation: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
      includeCodeAnalysis: z.boolean().optional().default(false),
      selectedRepos: z.array(z.string()).optional(),
      forceRefreshScorecards: z.boolean().optional().default(false),
    }))
    .subscription(async function* ({ input, ctx }) {
      const { username } = input;
      const normalizedUsername = username.toLowerCase();
      const lockKey = `profile:${normalizedUsername}`;
      let lockAcquired = false;

      try {
        // 1. Check for recently generated profile to prevent spam/retries
        const recentProfile = await db
          .select()
          .from(developerProfileCache)
          .where(eq(developerProfileCache.username, normalizedUsername))
          .orderBy(desc(developerProfileCache.version))
          .limit(1);

        if (recentProfile.length > 0) {
          const profile = recentProfile[0];
          const timeSinceUpdate = new Date().getTime() - profile.updatedAt.getTime();
          if (timeSinceUpdate < 5 * 60 * 1000) {
            yield { type: 'progress', progress: 100, message: 'Profile was just generated! Loading results...' };
            yield {
              type: 'complete',
              data: {
                profile: profile.profileData,
                cached: true,
                stale: false,
                lastUpdated: profile.updatedAt,
              },
            };
            return;
          }
        }

        // 2. Acquire generation lock BEFORE first yield (prevents double-start
        //    from SSE reconnects).
        const { acquireGenerationLock } = await import('@/lib/rate-limit');
        lockAcquired = await acquireGenerationLock(lockKey, 300);

        if (!lockAcquired) {
          yield { type: 'already_in_progress', message: 'A profile generation is already in progress for this user.' };
          return;
        }

        yield { type: 'progress', progress: 0, message: 'Starting profile generation...' };

        const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);

        let effectivePlan = plan;
        let isStargazerPerk = false;

        if (!subscription || subscription.status !== 'active') {
          const perkResult = await checkStargazerPerk(ctx.user.id, ctx.session, 'profile', plan);
          if (!perkResult.isStargazerPerk) {
            yield { type: 'error', message: perkResult.errorMessage };
            return;
          }
          isStargazerPerk = true;
          effectivePlan = perkResult.effectivePlan;
        }

        const keyInfo = await getApiKeyForUser(ctx.user.id, effectivePlan);
        if (!keyInfo) {
          yield { type: 'error', message: 'Please add your Gemini API key in settings to use this feature' };
          return;
        }

        // BYOK daily limit (skip when riding the stargazer perk)
        if (effectivePlan === 'byok' && !isStargazerPerk) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayUsage = await db
            .select()
            .from(tokenUsage)
            .where(
              and(
                eq(tokenUsage.userId, ctx.user.id),
                eq(tokenUsage.feature, 'profile'),
                gte(tokenUsage.createdAt, today)
              )
            );

          if (todayUsage.length >= 5) {
            yield { type: 'error', message: 'Daily limit of 5 profile generations reached. Upgrade to Pro for unlimited generations.' };
            return;
          }
        }

        yield { type: 'progress', progress: 10, message: `Fetching repositories for ${username}...` };

        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const repos = await githubService.getUserRepositories(username);

        let smartSortedRepos;

        if (input.selectedRepos && input.selectedRepos.length > 0) {
          smartSortedRepos = repos.filter(repo =>
            input.selectedRepos!.includes(repo.name) && !repo.fork
          );
          smartSortedRepos.sort((a, b) => {
            const aIndex = input.selectedRepos!.indexOf(a.name);
            const bIndex = input.selectedRepos!.indexOf(b.name);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            return (b.stargazersCount || 0) - (a.stargazersCount || 0);
          });
        } else {
          smartSortedRepos = repos
            .filter(repo => !repo.fork)
            .sort((a, b) => {
              const starScore = (b.stargazersCount || 0) - (a.stargazersCount || 0);
              if (Math.abs(starScore) > 5) return starScore;
              const forkScore = (b.forksCount || 0) - (a.forksCount || 0);
              if (Math.abs(forkScore) > 2) return forkScore;
              return (b.description?.length || 0) - (a.description?.length || 0);
            })
            .slice(0, 15);
        }

        const repoFiles: Array<{
          repoName: string;
          files: Array<{ path: string; content: string }>;
        }> = [];

        if (input.includeCodeAnalysis && smartSortedRepos.length > 0) {
          const maxReposToAnalyze = input.selectedRepos && input.selectedRepos.length > 0 ? 15 : 5;
          const topRepos = smartSortedRepos.slice(0, maxReposToAnalyze);

          const fileFetchPromises = topRepos.map(async (repo) => {
            try {
              // Use the repo's actual default branch — hardcoding 'main' 404'd
              // for repos still on 'master', silently dropping them.
              const ref = repo.defaultBranch || 'main';
              const files = await githubService.getRepositoryFiles(username, repo.name, ref);

              const importantFiles = files.files.filter((file: { path: string; size: number }) =>
                !file.path.includes('node_modules') &&
                !file.path.includes('.git') &&
                !file.path.includes('dist') &&
                !file.path.includes('build') &&
                !file.path.includes('.next') &&
                file.size < 100000 &&
                (file.path.endsWith('.ts') ||
                 file.path.endsWith('.tsx') ||
                 file.path.endsWith('.js') ||
                 file.path.endsWith('.jsx') ||
                 file.path.endsWith('.py') ||
                 file.path.endsWith('.java') ||
                 file.path.endsWith('.go') ||
                 file.path.endsWith('.rs') ||
                 file.path.endsWith('.md') ||
                 file.path.endsWith('package.json') ||
                 file.path.endsWith('README.md'))
              ).slice(0, 10);

              const fileContents = await Promise.all(
                importantFiles.map(async (file: { path: string; size: number }) => {
                  try {
                    const response = await githubService['octokit'].repos.getContent({
                      owner: username,
                      repo: repo.name,
                      path: file.path,
                    });

                    if (Array.isArray(response.data)) return null;
                    if (response.data.type === 'file' && 'content' in response.data) {
                      const fileData = response.data as { content: string };
                      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                      return { path: file.path, content };
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })
              );

              const validFiles = fileContents.filter(Boolean) as Array<{ path: string; content: string }>;
              if (validFiles.length > 0) {
                return { repoName: repo.name, files: validFiles };
              }
              return null;
            } catch (error) {
              if (error instanceof Error && !error.message.includes('404')) {
                console.warn(`Failed to analyze ${repo.name}:`, error.message);
              }
              return null;
            }
          });

          const fileResults = await Promise.all(fileFetchPromises);
          fileResults.forEach(result => {
            if (result) repoFiles.push(result);
          });
        }

        let result;
        const generator = generateDeveloperProfileStreaming({
          username,
          repos: smartSortedRepos,
          repoFiles: input.includeCodeAnalysis ? repoFiles : undefined,
          userId: ctx.user.id,
          forceRefreshScorecards: input.forceRefreshScorecards,
        });

        for await (const update of generator) {
          if (update.type === 'progress') {
            yield { type: 'progress', progress: update.progress, message: update.message };
          } else if (update.type === 'repo_failed') {
            // Surface per-repo scorecard failures to the client without
            // touching the progress bar. The previous code path swallowed
            // these silently so e.g. a failed scorecard looked like success.
            yield {
              type: 'repo_failed',
              repo: update.failedRepo,
              reason: update.failedReason,
              message: update.message,
            };
          } else if (update.type === 'complete') {
            result = update.result;
          }
        }

        if (!result) throw new Error('Failed to generate profile');

        yield { type: 'progress', progress: 90, message: 'Profile generated, saving results...' };

        if (!result.profile) throw new Error('Generated profile is null or undefined');

        let profileInserted = false;
        for (let retryCount = 0; retryCount < 3; retryCount++) {
          const maxVersionResult = await db
            .select({ max: sql<number | null>`COALESCE(MAX(version), 0)` })
            .from(developerProfileCache)
            .where(eq(developerProfileCache.username, normalizedUsername));
          const nextVersion = (maxVersionResult[0]?.max ?? 0) + 1;

          try {
            const [insertResult] = await db
              .insert(developerProfileCache)
              .values({
                username: normalizedUsername,
                version: nextVersion,
                profileData: result.profile,
                updatedAt: new Date(),
              })
              .onConflictDoNothing()
              .returning();

            if (insertResult) {
              profileInserted = true;
              break;
            }
          } catch (e) {
            if (isPgErrorWithCode(e) && e.code === '23505') continue;
            throw e;
          }
        }
        if (!profileInserted) {
          console.warn(`[generateProfile] failed to insert cache for ${normalizedUsername} after 3 retries`);
        }

        // Token usage log — non-critical, never fail the generation on this.
        try {
          await db.insert(tokenUsage).values({
            userId: ctx.user.id,
            feature: 'profile',
            repoOwner: normalizedUsername,
            repoName: null,
            model: 'gemini-3.1-pro-preview',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            totalTokens: result.usage.totalTokens,
            isByok: keyInfo.isByok,
            createdAt: new Date(),
          });
        } catch (tokenError) {
          console.error('[generateProfile] token usage log failed (non-critical):', tokenError);
        }

        // Best-effort: find an email and notify the developer their profile
        // was analyzed. Errors here never fail the request.
        try {
          const email = await findAndStoreDeveloperEmail(githubService['octokit'], username, smartSortedRepos);

          if (email) {
            const emailRecord = await db.query.developerEmails.findFirst({
              where: eq(developerEmails.email, email),
            });

            const ONE_HOUR = 60 * 60 * 1000;
            const timeSinceLastEmail = emailRecord?.lastUsedAt
              ? new Date().getTime() - emailRecord.lastUsedAt.getTime()
              : Infinity;

            if (timeSinceLastEmail >= ONE_HOUR) {
              const { sendProfileAnalysisEmail } = await import('@/lib/email/resend');
              const analyzerGithubUsername = ctx.user.name || 'Someone';

              const scorecardScores = result.profile.topRepos
                ?.map(repo => repo.significanceScore)
                .filter(Boolean) || [];
              const avgScore = scorecardScores.length > 0
                ? Math.round(scorecardScores.reduce((a, b) => a + b, 0) / scorecardScores.length * 10)
                : undefined;

              await sendProfileAnalysisEmail({
                recipientEmail: email,
                recipientUsername: username,
                analyzerUsername: analyzerGithubUsername,
                analyzerEmail: ctx.user.email,
                profileData: {
                  summary: result.profile.summary || 'Your profile has been analyzed!',
                  overallScore: avgScore,
                  topSkills: result.profile.techStack?.slice(0, 5).map(item => item.name) || [],
                  suggestions: result.profile.suggestions || [],
                },
              });

              await db.update(developerEmails)
                .set({ lastUsedAt: new Date() })
                .where(eq(developerEmails.email, email));
            }
          }
        } catch (e) {
          console.error('[generateProfile] developer email step failed:', e);
        }

        if (lockAcquired) {
          const { releaseGenerationLock: releaseLock } = await import('@/lib/rate-limit');
          await releaseLock(lockKey);
          lockAcquired = false;
        }

        yield {
          type: 'complete',
          data: {
            profile: result.profile,
            cached: false,
            stale: false,
            lastUpdated: new Date(),
          },
        };
      } catch (error) {
        if (lockAcquired) {
          try {
            const { releaseGenerationLock: releaseLock } = await import('@/lib/rate-limit');
            await releaseLock(lockKey);
            lockAcquired = false;
          } catch (releaseErr) {
            console.error('Failed to release generation lock:', releaseErr);
          }
        }

        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate developer profile';
        console.error('[generateProfile] error:', {
          username: input.username,
          userId: ctx.user.id,
          error: error instanceof Error ? error.message : error,
        });

        yield { type: 'error', message: userFriendlyMessage };

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: userFriendlyMessage,
          cause: error instanceof Error ? error : undefined,
        });
      } finally {
        // Safety net: release lock if still held (client disconnected mid-generator)
        if (lockAcquired) {
          try {
            const { releaseGenerationLock: releaseLock } = await import('@/lib/rate-limit');
            await releaseLock(lockKey);
          } catch (releaseErr) {
            console.error('Failed to release generation lock in finally:', releaseErr);
          }
        }
      }
    }),

  clearProfileCache: protectedProcedure
    .input(z.object({ username: z.string().min(1, 'Username is required') }))
    .mutation(async ({ ctx, input }) => {
      const normalizedUsername = input.username.toLowerCase();

      // Only the profile's own user can clear their cache.
      const currentUsername = ctx.user.githubUsername?.toLowerCase() ?? ctx.user.name?.toLowerCase();
      if (currentUsername !== normalizedUsername) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only clear your own profile cache',
        });
      }

      await db
        .delete(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername));

      return { success: true };
    }),
});
