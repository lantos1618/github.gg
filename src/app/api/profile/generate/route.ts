import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  developerProfileCache,
  tokenUsage,
  developerEmails,
} from '@/db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import {
  generateDeveloperProfileStreaming,
  findAndStoreDeveloperEmail,
} from '@/lib/ai/developer-profile';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import type { DeveloperProfile } from '@/lib/types/profile';
import {
  checkAIRateLimit,
  acquireGenerationLock,
  releaseGenerationLock,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 5000; // Send heartbeat every 5 seconds

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const username = searchParams.get('username');
  const includeCodeAnalysis =
    searchParams.get('includeCodeAnalysis') === 'true';
  const selectedRepos = searchParams.getAll('selectedRepo');

  if (!username) {
    return new Response('Missing username', { status: 400 });
  }

  // Auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Rate limiting
  const rateLimit = await checkAIRateLimit(session.user.id);
  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please wait before generating another profile.',
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.reset),
          'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  const encoder = new TextEncoder();
  const normalizedUsername = username.toLowerCase();
  const lockKey = `profile:${normalizedUsername}`;

  // Create an AbortController to detect client disconnect
  const abortController = new AbortController();
  let isAborted = false;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let lockAcquired = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        if (isAborted) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          // Controller may be closed
          isAborted = true;
        }
      };

      // Start heartbeat to keep connection alive during long operations
      heartbeatInterval = setInterval(() => {
        if (!isAborted) {
          sendEvent('heartbeat', { timestamp: Date.now() });
        }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        // Try to acquire generation lock to prevent duplicate concurrent requests
        lockAcquired = await acquireGenerationLock(lockKey, 300);
        if (!lockAcquired) {
          sendEvent('error', {
            type: 'error',
            message: 'Profile generation already in progress for this user. Please wait.',
          });
          controller.close();
          return;
        }

        sendEvent('progress', {
          type: 'progress',
          progress: 0,
          message: 'Starting profile generation...',
        });

        // 1. Check for very recent profile (within last 5 minutes) to avoid duplicate work
        const recentProfile = await db
          .select()
          .from(developerProfileCache)
          .where(eq(developerProfileCache.username, normalizedUsername))
          .orderBy(desc(developerProfileCache.version))
          .limit(1);

        if (recentProfile.length > 0) {
          const profile = recentProfile[0];
          const timeSinceUpdate =
            Date.now() - profile.updatedAt.getTime();

          if (timeSinceUpdate < FIVE_MINUTES_MS) {
            sendEvent('progress', {
              type: 'progress',
              progress: 100,
              message: 'Profile was just generated! Loading results...',
            });

            sendEvent('complete', {
              type: 'complete',
              data: {
                profile: profile.profileData as DeveloperProfile,
                cached: true,
                stale: false,
                lastUpdated: profile.updatedAt,
              },
            });

            controller.close();
            return;
          }
        }

        // 2. Check plan / subscription
        const { subscription, plan } = await getUserPlanAndKey(
          session.user.id,
        );

        let effectivePlan = plan;
        let isStargazerPerk = false;

        // If no active subscription, this SSE endpoint mirrors tRPC logic and does NOT
        // currently grant stargazer perks. Clients should continue to use the existing
        // tRPC subscription flow for that path.
        if (!subscription || subscription.status !== 'active') {
          sendEvent('error', {
            type: 'error',
            message:
              'Active subscription required. Tip: Star our repo (lantos1618/github.gg) to unlock perks in the app.',
          });
          controller.close();
          return;
        }

        // 3. Get appropriate API key
        const keyInfo = await getApiKeyForUser(
          session.user.id,
          effectivePlan as 'byok' | 'pro',
        );

        if (!keyInfo) {
          sendEvent('error', {
            type: 'error',
            message:
              'Please add your Gemini API key in settings to use this feature',
          });
          controller.close();
          return;
        }

        // 4. Daily BYOK generation limits (if not using stargazer perk)
        if (effectivePlan === 'byok' && !isStargazerPerk) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayUsage = await db
            .select()
            .from(tokenUsage)
            .where(
              and(
                eq(tokenUsage.userId, session.user.id),
                eq(tokenUsage.feature, 'profile'),
                gte(tokenUsage.createdAt, today),
              ),
            );

          if (todayUsage.length >= 5) {
            sendEvent('error', {
              type: 'error',
              message:
                'Daily limit of 5 profile generations reached. Upgrade to Pro for unlimited generations.',
            });
            controller.close();
            return;
          }
        }

        sendEvent('progress', {
          type: 'progress',
          progress: 10,
          message: `Fetching repositories for ${username}...`,
        });

        // 5. Fetch repositories
        const githubService =
          await createGitHubServiceForUserOperations(session);
        const repos = await githubService.getUserRepositories(username);

        let smartSortedRepos = repos;

        // If user provided specific repos, use those
        if (selectedRepos && selectedRepos.length > 0) {
          smartSortedRepos = repos.filter(
            (repo) =>
              selectedRepos.includes(repo.name) && !repo.fork,
          );

          smartSortedRepos.sort((a, b) => {
            const aIndex = selectedRepos.indexOf(a.name);
            const bIndex = selectedRepos.indexOf(b.name);

            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }

            return (
              (b.stargazersCount || 0) - (a.stargazersCount || 0)
            );
          });
        } else {
          // Auto-select: prioritize by stars, forks, description quality
          smartSortedRepos = repos
            .filter((repo) => !repo.fork)
            .sort((a, b) => {
              const starScore =
                (b.stargazersCount || 0) - (a.stargazersCount || 0);
              if (Math.abs(starScore) > 5) return starScore;

              const forkScore =
                (b.forksCount || 0) - (a.forksCount || 0);
              if (Math.abs(forkScore) > 2) return forkScore;

              return (
                (b.description?.length || 0) -
                (a.description?.length || 0)
              );
            })
            .slice(0, 15);
        }

        sendEvent('progress', {
          type: 'progress',
          progress: 20,
          message: `Selected ${smartSortedRepos.length} repositories for analysis...`,
        });

        const repoFiles: Array<{
          repoName: string;
          files: Array<{ path: string; content: string }>;
        }> = [];

        // 6. Optionally fetch files and generate scorecards
        if (includeCodeAnalysis && smartSortedRepos.length > 0) {
          const topRepos = smartSortedRepos.slice(0, 5);

          sendEvent('progress', {
            type: 'progress',
            progress: 25,
            message: `Fetching files for ${topRepos.length} repositories...`,
          });

          const fileFetchPromises = topRepos.map(async (repo) => {
            try {
              const files =
                await githubService.getRepositoryFiles(
                  username,
                  repo.name,
                  'main',
                );

              const importantFiles = files.files
                .filter(
                  (file: { path: string; size: number }) =>
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
                      file.path.endsWith('README.md')),
                )
                .slice(0, 10);

              const fileContents = await Promise.all(
                importantFiles.map(
                  async (file: { path: string; size: number }) => {
                    try {
                      const response =
                        await githubService['octokit'].repos.getContent(
                          {
                            owner: username,
                            repo: repo.name,
                            path: file.path,
                          },
                        );

                      if (Array.isArray(response.data)) {
                        return null;
                      }

                      if (
                        response.data.type === 'file' &&
                        'content' in response.data
                      ) {
                        const fileData = response.data as {
                          content: string;
                        };
                        const content = Buffer.from(
                          fileData.content,
                          'base64',
                        ).toString('utf-8');
                        return { path: file.path, content };
                      }

                      return null;
                    } catch (error) {
                      console.warn(
                        `Failed to fetch ${file.path}:`,
                        error,
                      );
                      return null;
                    }
                  },
                ),
              );

              const validFiles = fileContents.filter(
                Boolean,
              ) as Array<{ path: string; content: string }>;

              if (validFiles.length > 0) {
                return {
                  repoName: repo.name,
                  files: validFiles,
                };
              }
              return null;
            } catch (error) {
              if (
                error instanceof Error &&
                !error.message.includes('404')
              ) {
                console.warn(
                  `Failed to analyze ${repo.name}:`,
                  error.message,
                );
              }
              return null;
            }
          });

          const fileResults = await Promise.all(fileFetchPromises);
          fileResults.forEach((result) => {
            if (result) {
              repoFiles.push(result);
            }
          });
        }

        sendEvent('progress', {
          type: 'progress',
          progress: 40,
          message: `Generating profile for ${username}...`,
        });

        // 7. Run the streaming generator and bridge progress updates
        let result: {
          profile: DeveloperProfile;
          usage: { inputTokens: number; outputTokens: number; totalTokens: number };
        } | null = null;

        const generator = generateDeveloperProfileStreaming({
          username,
          repos: smartSortedRepos,
          repoFiles: includeCodeAnalysis ? repoFiles : undefined,
          userId: session.user.id,
        });

        for await (const update of generator) {
          if (update.type === 'progress') {
            sendEvent('progress', {
              type: 'progress',
              progress: update.progress,
              message: update.message,
            });
          } else if (update.type === 'complete' && update.result) {
            result = update.result;
          }
        }

        if (!result) {
          throw new Error('Failed to generate profile');
        }

        sendEvent('progress', {
          type: 'progress',
          progress: 90,
          message: 'Profile generated, saving results...',
        });

        // 8. Cache result with versioning
        const maxVersionResult = await db
          .select({
            max: sql<number | null>`COALESCE(MAX(version), 0)`,
          })
          .from(developerProfileCache)
          .where(eq(developerProfileCache.username, normalizedUsername));

        const nextVersion = (maxVersionResult[0]?.max ?? 0) + 1;

        await db.insert(developerProfileCache).values({
          username: normalizedUsername,
          version: nextVersion,
          profileData: result.profile,
          updatedAt: new Date(),
        });

        // 9. Log token usage
        await db.insert(tokenUsage).values({
          userId: session.user.id,
          feature: 'profile',
          repoOwner: username,
          repoName: null,
          model: 'gemini-3-pro-preview',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });

        // 10. Try to find developer email and send profile analysis email
        try {
          const email = await findAndStoreDeveloperEmail(
            githubService['octokit'],
            username,
            smartSortedRepos,
          );

          if (email) {
            const emailRecord = await db.query.developerEmails.findFirst(
              {
                where: eq(developerEmails.email, email),
              },
            );

            const ONE_HOUR = 60 * 60 * 1000;
            const timeSinceLastEmail = emailRecord?.lastUsedAt
              ? Date.now() - emailRecord.lastUsedAt.getTime()
              : Infinity;

            if (timeSinceLastEmail >= ONE_HOUR) {
              const { sendProfileAnalysisEmail } = await import(
                '@/lib/email/resend'
              );

              const analyzerGithubUsername =
                session.user.name || 'Someone';

              const scorecardScores =
                result.profile.topRepos
                  ?.map((repo) => repo.significanceScore)
                  .filter(Boolean) || [];

              const avgScore =
                scorecardScores.length > 0
                  ? Math.round(
                      (scorecardScores.reduce(
                        (a, b) => a + b,
                        0,
                      ) /
                        scorecardScores.length) *
                        10,
                    )
                  : undefined;

              await sendProfileAnalysisEmail({
                recipientEmail: email,
                recipientUsername: username,
                analyzerUsername: analyzerGithubUsername,
                analyzerEmail: session.user.email,
                profileData: {
                  summary:
                    result.profile.summary ||
                    'Your profile has been analyzed!',
                  overallScore: avgScore,
                  topSkills:
                    result.profile.techStack
                      ?.slice(0, 5)
                      .map((item) => item.name) || [],
                  suggestions: result.profile.suggestions || [],
                },
              });

              await db
                .update(developerEmails)
                .set({ lastUsedAt: new Date() })
                .where(eq(developerEmails.email, email));
            }
          }
        } catch (emailError) {
          console.error(
            'Failed to extract/send developer email:',
            emailError,
          );
        }

        sendEvent('complete', {
          type: 'complete',
          data: {
            profile: result.profile,
            cached: false,
            stale: false,
            lastUpdated: new Date(),
          },
        });

        controller.close();
      } catch (error) {
        console.error('Error generating developer profile via SSE:', error);
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to generate developer profile';

        sendEvent('error', {
          type: 'error',
          message,
        });
        controller.close();
      } finally {
        // Cleanup: stop heartbeat and release lock
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        if (lockAcquired) {
          await releaseGenerationLock(lockKey);
        }
      }
    },
    cancel() {
      // Client disconnected - cleanup resources
      isAborted = true;
      abortController.abort();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (lockAcquired) {
        releaseGenerationLock(lockKey).catch(console.error);
      }
      console.log('SSE: Client disconnected, resources cleaned up');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}


