import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache, tokenUsage, developerEmails } from '@/db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { generateDeveloperProfileStreaming, findAndStoreDeveloperEmail, type CrossRepoCommit } from '@/lib/ai/developer-profile';
import { geminiUsageRows } from '@/lib/ai/models';
import { generateProfileEmbedding } from '@/lib/ai/embeddings';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { checkStargazerPerk } from '@/lib/utils/stargazer-perk';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForRepo, createGitHubServiceForUserOperations, type RepoSummary } from '@/lib/github';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';
import { getCurrentlyPublicRepositoryKeys } from '@/lib/github/public-visibility';
import { areRepositoriesCurrentlyPublic, filterCurrentlyPublicProfiles, withVerifiedPublicSources } from '@/lib/profile/public-provenance';
import type { Octokit } from '@octokit/rest';
import { isPgErrorWithCode } from '@/lib/db/utils';
import { isCurrentGitHubProfileOwner } from '@/lib/profile/service';

/**
 * Build the deduped list of repos to scan when extracting a developer's email.
 *
 * Bug fix: the previous code only scanned the user's own top 3 repos. If their
 * real (non-noreply) email only ever appears on commits to OTHER people's
 * repos — e.g. `badlogic` contributing to `cloudflare/cloudflare-docs` — that
 * email is invisible. We now also include repos from their cross-repo commits.
 *
 * Each entry carries the REAL owner so the patch URL builder in
 * findAndStoreDeveloperEmail hits `cloudflare/cloudflare-docs/...` instead of
 * `badlogic/cloudflare-docs/...` (which 404s).
 */
function buildEmailScanRepos(
  ownedRepos: RepoSummary[],
  crossRepoCommits: CrossRepoCommit[] | undefined
): { owner: string; name: string }[] {
  const seen = new Set<string>();
  const out: { owner: string; name: string }[] = [];

  for (const r of ownedRepos.slice(0, 3)) {
    const key = `${r.owner.toLowerCase()}/${r.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ owner: r.owner, name: r.name });
  }

  if (crossRepoCommits) {
    for (const c of crossRepoCommits) {
      const key = `${c.repoOwner.toLowerCase()}/${c.repoName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ owner: c.repoOwner, name: c.repoName });
      if (out.length >= 6) break; // 3 own + 3 cross
    }
  }

  return out;
}

/**
 * Fetch a user's recent public PushEvents and extract commits to repos they
 * don't own. Same logic as inside generateProfileMutation; factored out so
 * refreshDeveloperEmail can build the same cross-repo repo list without
 * needing to re-run profile generation.
 */
async function fetchCrossRepoCommits(
  octokit: Octokit,
  username: string,
  ownedRepoKeys: Set<string>
): Promise<CrossRepoCommit[]> {
  const collected: CrossRepoCommit[] = [];
  try {
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: 100,
    });

    const MAX_TOTAL = 20;
    const MAX_PER_REPO = 5;
    const MAX_SCANNED = 50;
    const perRepoCount = new Map<string, number>();
    let scanned = 0;

    for (const ev of events) {
      if (ev.type !== 'PushEvent') continue;
      const [evOwner, evRepoName] = (ev.repo?.name || '').split('/');
      if (!evOwner || !evRepoName) continue;
      const repoKey = `${evOwner.toLowerCase()}/${evRepoName.toLowerCase()}`;
      if (ownedRepoKeys.has(repoKey)) continue;

      const payload = ev.payload as unknown as {
        commits?: Array<{
          sha?: string;
          message?: string;
          author?: { email?: string; name?: string };
        }>;
      };
      const commits = payload?.commits ?? [];
      const createdAt = ev.created_at || new Date().toISOString();

      for (const commit of commits) {
        if (scanned >= MAX_SCANNED) break;
        scanned++;
        if (collected.length >= MAX_TOTAL) break;
        const used = perRepoCount.get(repoKey) ?? 0;
        if (used >= MAX_PER_REPO) continue;
        if (!commit.sha || !commit.message) continue;

        collected.push({
          repoOwner: evOwner,
          repoName: evRepoName,
          sha: commit.sha,
          message: commit.message,
          date: createdAt,
        });
        perRepoCount.set(repoKey, used + 1);
      }

      if (collected.length >= MAX_TOTAL || scanned >= MAX_SCANNED) break;
    }
  } catch (err) {
    console.warn('[email-extract] cross-repo commit fetch failed (non-critical):', err instanceof Error ? err.message : err);
  }
  return collected;
}

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

      const publicRecentProfile = await filterCurrentlyPublicProfiles(recentProfile);
      const hasRecentProfile = publicRecentProfile.length > 0 &&
        (new Date().getTime() - recentProfile[0].updatedAt.getTime() < 5 * 60 * 1000);

      const { isGenerationInProgress } = await import('@/lib/rate-limit');
      const lockExists = await isGenerationInProgress(lockKey);

      return {
        hasRecentProfile,
        profile: hasRecentProfile ? publicRecentProfile[0].profileData : null,
        lockExists,
        canReconnect: lockExists && !hasRecentProfile,
      };
    }),

  generateProfileMutation: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
      // Default true so any caller that omits the field still writes per-repo
      // scorecards. The UI always passes true; non-UI callers (admin, scripts)
      // were the only path where this defaulted false and scorecards silently
      // weren't written.
      includeCodeAnalysis: z.boolean().optional().default(true),
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
          if (timeSinceUpdate < 5 * 60 * 1000 && (await filterCurrentlyPublicProfiles([profile])).length > 0) {
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
          smartSortedRepos = smartSortedRepos.slice(0, 15);
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

        // The user OAuth service can see private repositories. Every source
        // entering a public profile must be independently visible without it.
        const profileSourceRepos = smartSortedRepos.map(repo => ({ owner: repo.owner, name: repo.name }));
        if (!(await areRepositoriesCurrentlyPublic(profileSourceRepos))) {
          throw new Error('Repository visibility could not be verified as public. Please retry.');
        }

        // Fetch the user's recent public commit activity on repos they DON'T own.
        // GitHub's Events API only returns the last ~90 days of activity by design,
        // which is fine for "what is this dev currently contributing to" signal.
        // Failure here must NOT block profile generation; the helper returns [].
        const ownedRepoKeys = new Set(
          smartSortedRepos.map(r => `${r.owner.toLowerCase()}/${r.name.toLowerCase()}`)
        );
        const fetchedCrossRepoCommits = await fetchCrossRepoCommits(
          githubService.octokit,
          username,
          ownedRepoKeys
        );
        const publicContributionKeys = await getCurrentlyPublicRepositoryKeys(
          fetchedCrossRepoCommits.map(commit => ({ owner: commit.repoOwner, name: commit.repoName }))
        );
        const crossRepoCommits = fetchedCrossRepoCommits.filter(commit =>
          publicContributionKeys.has(`${commit.repoOwner.toLowerCase()}/${commit.repoName.toLowerCase()}`)
        ).slice(0, 15);
        for (const commit of crossRepoCommits) {
          const key = `${commit.repoOwner.toLowerCase()}/${commit.repoName.toLowerCase()}`;
          if (!profileSourceRepos.some(repo => `${repo.owner.toLowerCase()}/${repo.name.toLowerCase()}` === key)) {
            profileSourceRepos.push({ owner: commit.repoOwner, name: commit.repoName });
          }
        }
        if (crossRepoCommits.length > 0) {
          const uniqueRepos = new Set(
            crossRepoCommits.map(c => `${c.repoOwner.toLowerCase()}/${c.repoName.toLowerCase()}`)
          );
          console.log(`📤 Cross-repo commits collected: ${crossRepoCommits.length} across ${uniqueRepos.size} repo(s)`);
        }

        const repoFiles: Array<{
          repoName: string;
          owner: string;
          defaultBranch: string;
          files: Array<{ path: string; content: string }>;
        }> = [];

        if (input.includeCodeAnalysis && smartSortedRepos.length > 0) {
          const maxReposToAnalyze = input.selectedRepos && input.selectedRepos.length > 0 ? 15 : 5;
          const topRepos = smartSortedRepos.slice(0, maxReposToAnalyze);

          const fileFetchPromises = topRepos.map(async (repo) => {
            const currentInfo = await getAccessibleRepositoryInfo(repo.owner, repo.name, null);
            if (!currentInfo || currentInfo.private) throw new Error(`Repository visibility changed for ${repo.owner}/${repo.name}`);
            try {
              // Use the repo's actual default branch — hardcoding 'main' 404'd
              // for repos still on 'master', silently dropping them.
              const ref = repo.defaultBranch || 'main';
              const publicService = await createGitHubServiceForRepo(repo.owner, repo.name, null);
              const files = await publicService.getRepositoryFiles(repo.owner, repo.name, ref);

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
                    const response = await publicService.octokit.repos.getContent({
                      owner: repo.owner,
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
                return {
                  repoName: repo.name,
                  // Thread the ACTUAL owner + branch through to the scorecard
                  // write path — see developer-profile.ts for why this matters.
                  owner: repo.owner,
                  defaultBranch: repo.defaultBranch || 'main',
                  files: validFiles,
                };
              }
              return null;
            } catch (error) {
              if (error instanceof Error && !error.message.includes('404')) {
                console.warn(`Failed to analyze ${repo.name}:`, error.message);
              }
              return null;
            } finally {
              const latestInfo = await getAccessibleRepositoryInfo(repo.owner, repo.name, null);
              if (!latestInfo || latestInfo.private) throw new Error(`Repository visibility changed for ${repo.owner}/${repo.name}`);
            }
          });

          const fileResults = await Promise.all(fileFetchPromises);
          fileResults.forEach(result => {
            if (result) repoFiles.push(result);
          });
        }

        let result;
        const generator = generateDeveloperProfileStreaming({
          apiKey: keyInfo.apiKey,
          username,
          repos: smartSortedRepos,
          repoFiles: input.includeCodeAnalysis ? repoFiles : undefined,
          userId: ctx.user.id,
          forceRefreshScorecards: input.forceRefreshScorecards,
          crossRepoCommits: crossRepoCommits.length > 0 ? crossRepoCommits : undefined,
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

        // The AI has incorporated metadata, source files and public event
        // commits. Abort publication if any source is now private or unknown.
        if (!(await areRepositoriesCurrentlyPublic(profileSourceRepos))) {
          throw new Error('Repository visibility changed during profile generation. Please retry.');
        }
        const publicProfile = withVerifiedPublicSources(result.profile, profileSourceRepos);

        let profileInserted = false;
        let insertedVersion: number | null = null;
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
                profileData: publicProfile,
                updatedAt: new Date(),
              })
              .onConflictDoNothing()
              .returning();

            if (insertResult) {
              profileInserted = true;
              insertedVersion = insertResult.version;
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

        // Best-effort: compute + persist embedding for the semantic developer
        // map. Failures here must not break profile generation — the map's
        // backfill script (scripts/backfill-profile-embeddings.ts) re-picks
        // missing embeddings on its next run.
        //
        // Bound the background work with a 15s timeout so a slow Gemini call
        // or hung DB connection can't outlive the request and leak a Vercel
        // pool slot. Mirrors the scorecard embedding pattern in scorecard.ts.
        if (profileInserted && insertedVersion !== null && result.profile) {
          const BACKGROUND_EMBED_TIMEOUT_MS = 15_000;
          const profileForEmbedding = publicProfile;
          const targetVersion = insertedVersion;
          const embeddingPromise = (async () => {
            const embedding = await generateProfileEmbedding(profileForEmbedding);
            await db
              .update(developerProfileCache)
              .set({ embedding })
              .where(
                and(
                  eq(developerProfileCache.username, normalizedUsername),
                  eq(developerProfileCache.version, targetVersion)
                )
              );
          })();
          let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
          const timeoutPromise = new Promise<'timeout'>((resolve) => {
            timeoutHandle = setTimeout(() => resolve('timeout'), BACKGROUND_EMBED_TIMEOUT_MS);
          });
          void Promise.race([embeddingPromise.then(() => 'ok' as const), timeoutPromise])
            .then((raceResult) => {
              if (raceResult === 'timeout') {
                console.warn(
                  `[profile.embedding] timed out, abandoning for ${normalizedUsername}@v${targetVersion}`
                );
              }
            })
            .catch((err) => {
              console.warn(
                `[profile.embedding] failed for ${normalizedUsername}@v${targetVersion}:`,
                err instanceof Error ? err.message : err
              );
            })
            .finally(() => {
              if (timeoutHandle) clearTimeout(timeoutHandle);
            });
        }

        // Token usage log — non-critical, never fail the generation on this.
        try {
          const usageRows = geminiUsageRows(result.modelUsage).map(({ model, usage }) => ({
            userId: ctx.user.id,
            feature: 'profile',
            repoOwner: normalizedUsername,
            repoName: null,
            model,
            ...usage,
            isByok: keyInfo.isByok,
            createdAt: new Date(),
          }));
          if (usageRows.length > 0) await db.insert(tokenUsage).values(usageRows);
        } catch (tokenError) {
          console.error('[generateProfile] token usage log failed (non-critical):', tokenError);
        }

        // Best-effort: find the developer's email and notify them. Run in the
        // background bounded by a 30s timeout — the subscription must NOT
        // wait on this, mirroring the embedding-write pattern above. The
        // profile is fully written by this point; email can land 30s later.
        const BACKGROUND_EMAIL_TIMEOUT_MS = 30_000;
        const profileForEmail = publicProfile;
        const analyzerUserName = ctx.user.name;
        const analyzerEmail = ctx.user.email;
        const emailScanRepos = buildEmailScanRepos(smartSortedRepos, crossRepoCommits);
        const octokitForEmail = githubService['octokit'];

        const emailPromise = (async () => {
          const { email } = await findAndStoreDeveloperEmail(
            octokitForEmail,
            username,
            emailScanRepos
          );
          if (!email) return;

          const emailRecord = await db.query.developerEmails.findFirst({
            where: eq(developerEmails.email, email),
          });

          const ONE_HOUR = 60 * 60 * 1000;
          const timeSinceLastEmail = emailRecord?.lastUsedAt
            ? new Date().getTime() - emailRecord.lastUsedAt.getTime()
            : Infinity;

          if (timeSinceLastEmail < ONE_HOUR) return;

          const { sendProfileAnalysisEmail } = await import('@/lib/email/resend');
          const analyzerGithubUsername = analyzerUserName || 'Someone';

          const scorecardScores = profileForEmail.topRepos
            ?.map(repo => repo.significanceScore)
            .filter(Boolean) || [];
          const avgScore = scorecardScores.length > 0
            ? Math.round(scorecardScores.reduce((a, b) => a + b, 0) / scorecardScores.length * 10)
            : undefined;

          // This work runs after the response path. A source can become
          // private while the email address is being discovered.
          if (!(await areRepositoriesCurrentlyPublic(profileSourceRepos))) return;

          await sendProfileAnalysisEmail({
            recipientEmail: email,
            recipientUsername: username,
            analyzerUsername: analyzerGithubUsername,
            analyzerEmail: analyzerEmail,
            profileData: {
              summary: profileForEmail.summary || 'Your profile has been analyzed!',
              overallScore: avgScore,
              topSkills: profileForEmail.techStack?.slice(0, 5).map(item => item.name) || [],
              suggestions: profileForEmail.suggestions || [],
            },
          });

          await db.update(developerEmails)
            .set({ lastUsedAt: new Date() })
            .where(eq(developerEmails.email, email));
        })();

        let emailTimeoutHandle: ReturnType<typeof setTimeout> | undefined;
        const emailTimeoutPromise = new Promise<'timeout'>((resolve) => {
          emailTimeoutHandle = setTimeout(() => resolve('timeout'), BACKGROUND_EMAIL_TIMEOUT_MS);
        });
        void Promise.race([emailPromise.then(() => 'ok' as const), emailTimeoutPromise])
          .then((raceResult) => {
            if (raceResult === 'timeout') {
              console.warn(
                `[email-extract] timed out, abandoning for ${normalizedUsername}`
              );
            }
          })
          .catch((err) => {
            console.error(
              `[email-extract] failed for ${normalizedUsername}:`,
              err instanceof Error ? err.message : err
            );
          })
          .finally(() => {
            if (emailTimeoutHandle) clearTimeout(emailTimeoutHandle);
          });

        if (lockAcquired) {
          const { releaseGenerationLock: releaseLock } = await import('@/lib/rate-limit');
          await releaseLock(lockKey);
          lockAcquired = false;
        }

        yield {
          type: 'complete',
          data: {
            profile: publicProfile,
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

  /**
   * Look up (and persist) a developer's real email by scanning recent commits
   * on both their own top repos AND repos they've contributed to via
   * cross-repo PushEvents. Split out from profile generation so the
   * generation subscription doesn't block on it (it's now also kicked off
   * fire-and-forget from generateProfileMutation, bounded by a 30s timeout).
   *
   * Returns the discovered email + which source produced it. Idempotent —
   * safe to call repeatedly; the DB write upserts on the email.
   */
  refreshDeveloperEmail: protectedProcedure
    .input(z.object({ username: z.string().min(1, 'Username is required') }))
    .mutation(async ({ ctx, input }) => {
      const { username } = input;
      const normalizedUsername = username.toLowerCase();

      if (!await isCurrentGitHubProfileOwner(ctx.session, normalizedUsername)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // First check what's already in the DB — no point burning GitHub API
      // budget if we've previously resolved this user's email.
      const cached = await db.query.developerEmails.findFirst({
        where: eq(developerEmails.username, normalizedUsername),
      });
      if (cached?.email) {
        return { email: cached.email, source: 'database' as const };
      }

      const githubService = await createGitHubServiceForUserOperations(ctx.session);
      const repos = await githubService.getUserRepositories(username);

      const ownedTop = repos
        .filter(r => !r.fork)
        .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0))
        .slice(0, 15);

      const ownedRepoKeys = new Set(
        ownedTop.map(r => `${r.owner.toLowerCase()}/${r.name.toLowerCase()}`)
      );

      const crossRepoCommits = await fetchCrossRepoCommits(
        githubService.octokit,
        username,
        ownedRepoKeys
      );

      const emailScanRepos = buildEmailScanRepos(ownedTop, crossRepoCommits);
      const result = await findAndStoreDeveloperEmail(
        githubService.octokit,
        username,
        emailScanRepos
      );

      return result;
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
