import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { githubWrapped, tokenUsage } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { WrappedService } from '@/lib/github/wrapped-service';
import { GITHUB_GG_REPO } from '@/lib/types/wrapped';
import { nanoid } from 'nanoid';
import {
  checkAIRateLimit,
  acquireGenerationLock,
  releaseGenerationLock,
} from '@/lib/rate-limit';
import { getUserSubscription } from '@/lib/utils/user-plan';
import { generateWrappedInsights } from '@/lib/ai/wrapped-insights';
import type { WrappedAIInsights } from '@/db/schema/wrapped';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 5000;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const withAI = searchParams.get('withAI') === 'true';
  const includeRoast = searchParams.get('includeRoast') === 'true';

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const rateLimit = await checkAIRateLimit(session.user.id);
  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please wait before generating another wrapped.',
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();
  const username = (session.user as { githubUsername?: string }).githubUsername || session.user.name || '';
  const lockKey = `wrapped:${username}:${year}`;

  let heartbeatInterval: NodeJS.Timeout | null = null;
  let lockAcquired = false;
  let isAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        if (isAborted) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          isAborted = true;
        }
      };

      heartbeatInterval = setInterval(() => {
        if (!isAborted) {
          sendEvent('heartbeat', { timestamp: Date.now() });
        }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        sendEvent('progress', { type: 'progress', progress: 5, message: 'Checking star status...' });

        const githubService = await createGitHubServiceForUserOperations(session);
        const hasStarred = await githubService.hasStarredRepo(
          GITHUB_GG_REPO.owner,
          GITHUB_GG_REPO.repo
        );

        if (!hasStarred) {
          sendEvent('star_required', {
            type: 'star_required',
            message: 'Please star github.gg to unlock your Wrapped!',
            repoUrl: GITHUB_GG_REPO.url,
          });
          controller.close();
          return;
        }

        sendEvent('progress', { type: 'progress', progress: 10, message: 'Checking for cached wrapped...' });

        const existingWrapped = await db
          .select()
          .from(githubWrapped)
          .where(
            and(
              eq(githubWrapped.userId, session.user.id),
              eq(githubWrapped.year, year)
            )
          )
          .limit(1);

        if (existingWrapped.length > 0) {
          const wrapped = existingWrapped[0];
          const timeSinceUpdate = Date.now() - wrapped.updatedAt.getTime();

          if (timeSinceUpdate < CACHE_DURATION_MS) {
            sendEvent('progress', { type: 'progress', progress: 100, message: 'Loading your cached wrapped...' });
            sendEvent('complete', {
              type: 'complete',
              data: {
                id: wrapped.id,
                userId: wrapped.userId,
                username: wrapped.username,
                year: wrapped.year,
                stats: wrapped.stats,
                aiInsights: wrapped.aiInsights,
                badgeTheme: wrapped.badgeTheme,
                isPublic: wrapped.isPublic,
                shareCode: wrapped.shareCode,
                createdAt: wrapped.createdAt,
                updatedAt: wrapped.updatedAt,
              },
              cached: true,
            });
            controller.close();
            return;
          }
        }

        lockAcquired = await acquireGenerationLock(lockKey, 300);
        if (!lockAcquired) {
          sendEvent('error', {
            type: 'error',
            message: 'Wrapped generation already in progress. Please wait.',
          });
          controller.close();
          return;
        }

        sendEvent('progress', { type: 'progress', progress: 20, message: 'Fetching your GitHub activity...' });

        const wrappedService = new WrappedService(githubService['octokit'], year);
        
        sendEvent('progress', { type: 'progress', progress: 30, message: 'Analyzing commits...' });
        
        const { stats, rawData } = await wrappedService.fetchWrappedStats(username);

        sendEvent('progress', { type: 'progress', progress: 70, message: 'Crunching the numbers...' });

        let aiInsights: WrappedAIInsights | null = null;
        
        if (withAI) {
          const subscription = await getUserSubscription(session.user.id);
          const isPro = subscription?.status === 'active' && subscription?.plan === 'pro';
          
          if (isPro) {
            sendEvent('progress', { type: 'progress', progress: 78, message: 'Generating AI personality analysis...' });
            
            try {
              const result = await generateWrappedInsights({
                username,
                stats,
                rawData,
                year,
                includeRoast,
              });
              
              aiInsights = result.insights;
              
              await db.insert(tokenUsage).values({
                userId: session.user.id,
                feature: 'wrapped_insights',
                inputTokens: result.usage.inputTokens,
                outputTokens: result.usage.outputTokens,
                totalTokens: result.usage.totalTokens,
                model: 'gemini-2.0-flash',
                isByok: false,
              });
              
              sendEvent('progress', { type: 'progress', progress: 82, message: 'AI analysis complete!' });
            } catch (aiError) {
              console.error('AI insights generation failed:', aiError);
              sendEvent('progress', { 
                type: 'progress', 
                progress: 82, 
                message: 'AI analysis skipped (API error). Continuing...' 
              });
            }
          } else {
            sendEvent('progress', { 
              type: 'progress', 
              progress: 82, 
              message: 'AI features require Pro subscription' 
            });
          }
        }

        const shareCode = nanoid(10);

        sendEvent('progress', { type: 'progress', progress: 85, message: 'Saving your wrapped...' });

        const [insertedWrapped] = await db
          .insert(githubWrapped)
          .values({
            userId: session.user.id,
            username: username.toLowerCase(),
            year,
            stats,
            aiInsights,
            shareCode,
            isPublic: true,
            badgeTheme: 'dark',
          })
          .onConflictDoUpdate({
            target: [githubWrapped.userId, githubWrapped.year],
            set: {
              stats,
              aiInsights,
              shareCode,
              updatedAt: new Date(),
            },
          })
          .returning();

        sendEvent('progress', { type: 'progress', progress: 100, message: 'Your wrapped is ready!' });

        sendEvent('complete', {
          type: 'complete',
          data: {
            id: insertedWrapped.id,
            userId: insertedWrapped.userId,
            username: insertedWrapped.username,
            year: insertedWrapped.year,
            stats: insertedWrapped.stats,
            aiInsights: insertedWrapped.aiInsights,
            badgeTheme: insertedWrapped.badgeTheme,
            isPublic: insertedWrapped.isPublic,
            shareCode: insertedWrapped.shareCode,
            createdAt: insertedWrapped.createdAt,
            updatedAt: insertedWrapped.updatedAt,
          },
          cached: false,
        });

        controller.close();
      } catch (error) {
        console.error('Error generating wrapped:', error);
        sendEvent('error', {
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate wrapped',
        });
        controller.close();
      } finally {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        if (lockAcquired) {
          await releaseGenerationLock(lockKey);
        }
      }
    },
    cancel() {
      isAborted = true;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (lockAcquired) {
        releaseGenerationLock(lockKey).catch(console.error);
      }
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
