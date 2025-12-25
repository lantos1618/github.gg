import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { githubWrapped, wrappedInvites, tokenUsage, developerEmails } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { GITHUB_GG_REPO } from '@/lib/types/wrapped';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { WrappedService } from '@/lib/github/wrapped-service';
import { generateWrappedInsights, generateWrappedInsightsStreaming } from '@/lib/ai/wrapped-insights';
import type { GenerateWrappedInsightsResult } from '@/lib/ai/wrapped-insights';
import { getUserSubscription } from '@/lib/utils/user-plan';
import { sendWrappedGiftEmail } from '@/lib/email/resend';
import type { WrappedAIInsights } from '@/db/schema/wrapped';

type ProgressMetadata = {
  commits?: number;
  repos?: number;
  sampleCommits?: Array<{ repo: string; message: string }>;
  prs?: number;
  personalityType?: string;
  personalityEmoji?: string;
  grade?: string;
  type?: string;
  insight?: string;
};

type ProgressUpdate = {
  message: string;
  metadata?: ProgressMetadata;
};

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const wrappedRouter = router({
  exists: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const year = input.year || new Date().getFullYear();
      const username = (ctx.user as { githubUsername?: string }).githubUsername;
      
      if (!username) {
        return { exists: false };
      }

      const wrapped = await db
        .select({ id: githubWrapped.id })
        .from(githubWrapped)
        .where(
          and(
            eq(githubWrapped.username, username.toLowerCase()),
            eq(githubWrapped.year, year)
          )
        )
        .limit(1);

      return { exists: wrapped.length > 0 };
    }),

  checkStar: protectedProcedure.query(async ({ ctx }) => {
    const githubService = await createGitHubServiceForUserOperations(ctx.session);
    const hasStarred = await githubService.hasStarredRepo(
      GITHUB_GG_REPO.owner,
      GITHUB_GG_REPO.repo
    );

    return {
      hasStarred,
      repoUrl: GITHUB_GG_REPO.url,
      username: (ctx.user as { githubUsername?: string }).githubUsername || ctx.user.name,
    };
  }),

  generateWrapped: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      withAI: z.boolean().optional().default(false),
      includeRoast: z.boolean().optional().default(false),
      force: z.boolean().optional().default(false),
    }))
    .subscription(async function* ({ input, ctx }) {
      const year = input.year || new Date().getFullYear();
      const { withAI, includeRoast, force } = input;
      const username = (ctx.user as { githubUsername?: string }).githubUsername || ctx.user.name || '';

      try {
        yield { type: 'progress', progress: 5, message: 'Checking star status...' };

        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const hasStarred = await githubService.hasStarredRepo(
          GITHUB_GG_REPO.owner,
          GITHUB_GG_REPO.repo
        );

        if (!hasStarred) {
          yield {
            type: 'star_required',
            message: 'Please star github.gg to unlock your Wrapped!',
            repoUrl: GITHUB_GG_REPO.url,
          };
          return;
        }

        yield { type: 'progress', progress: 10, message: 'Checking for existing wrapped...' };

        if (!force) {
          const existingWrapped = await db
            .select()
            .from(githubWrapped)
            .where(
              and(
                eq(githubWrapped.userId, ctx.user.id),
                eq(githubWrapped.year, year)
              )
            )
            .limit(1);

          if (existingWrapped.length > 0) {
            const wrapped = existingWrapped[0];
            const timeSinceUpdate = Date.now() - wrapped.updatedAt.getTime();

            if (timeSinceUpdate < CACHE_DURATION_MS) {
              yield { type: 'progress', progress: 100, message: 'Loading your cached wrapped...' };
              yield {
                type: 'complete',
                data: {
                  id: wrapped.id,
                  userId: wrapped.userId,
                  username: wrapped.username,
                  year: wrapped.year,
                  stats: wrapped.stats,
                  aiInsights: wrapped.aiInsights,
                  badgeTheme: wrapped.badgeTheme || 'dark',
                  isPublic: wrapped.isPublic ?? true,
                  shareCode: wrapped.shareCode,
                  createdAt: wrapped.createdAt,
                  updatedAt: wrapped.updatedAt,
                },
                cached: true,
              };
              return;
            }
          }
        }

        yield { type: 'progress', progress: 20, message: 'Fetching your GitHub activity...' };

        const wrappedService = new WrappedService(githubService['octokit'], year);
        
        let commitAnalysisProgress = 30;
        const progressQueue: ProgressUpdate[] = [];
        
        const { stats, rawData } = await wrappedService.fetchWrappedStats(
          username,
          (message, metadata) => {
            commitAnalysisProgress = Math.min(commitAnalysisProgress + 5, 55);
            progressQueue.push({ message, metadata });
          }
        );
        
        // Yield all queued progress updates
        for (const update of progressQueue) {
          yield { 
            type: 'progress', 
            progress: commitAnalysisProgress, 
            message: update.message,
            metadata: update.metadata ? {
              commits: update.metadata.commits,
              repos: update.metadata.repos,
              sampleCommits: update.metadata.sampleCommits,
            } : undefined,
          };
        }

        yield { type: 'progress', progress: 60, message: 'Crunching the numbers...' };

        let aiInsights: WrappedAIInsights | null = null;
        
        if (withAI) {
          const subscription = await getUserSubscription(ctx.user.id);
          const isPro = subscription?.status === 'active' && subscription?.plan === 'pro';
          
          if (isPro) {
            yield { type: 'progress', progress: 70, message: '🤖 Starting AI analysis...' };
            
            try {
              let finalResult: GenerateWrappedInsightsResult | null = null;
              
              // Use streaming generator for real-time progress
              const insightsGenerator = generateWrappedInsightsStreaming({
                username,
                stats,
                rawData,
                year,
                includeRoast,
              });
              
              for await (const update of insightsGenerator) {
                if (update.type === 'progress') {
                  // Map AI progress (0-100) to our wrapped progress range (70-79)
                  const mappedProgress = 70 + Math.floor((update.progress || 0) * 0.09);
                  yield {
                    type: 'progress',
                    progress: mappedProgress,
                    message: update.message || 'AI analyzing...',
                    metadata: update.metadata,
                  };
                } else if (update.type === 'stream') {
                  // Stream actual AI tokens
                  const mappedProgress = 70 + Math.floor((update.progress || 30) * 0.09);
                  yield {
                    type: 'progress',
                    progress: mappedProgress,
                    message: update.message || 'AI is thinking...',
                    metadata: {
                      ...update.metadata,
                      streaming: true,
                      textChunk: update.text,
                    },
                  };
                } else if (update.type === 'complete' && update.result) {
                  finalResult = update.result;
                }
              }
              
              if (!finalResult) {
                throw new Error('AI analysis completed but no result received');
              }
              
              aiInsights = finalResult.insights;
              
              await db.insert(tokenUsage).values({
                userId: ctx.user.id,
                feature: 'wrapped_insights',
                inputTokens: finalResult.usage.inputTokens,
                outputTokens: finalResult.usage.outputTokens,
                totalTokens: finalResult.usage.totalTokens,
                model: 'gemini-3-flash',
                isByok: false,
              });
              
              yield { type: 'progress', progress: 80, message: 'AI analysis complete!' };
            } catch (aiError) {
              console.error('AI insights generation failed:', aiError);
              yield { 
                type: 'progress', 
                progress: 80, 
                message: 'AI analysis skipped (API error). Continuing...' 
              };
            }
          } else {
            yield { 
              type: 'progress', 
              progress: 80, 
              message: 'AI features require Pro subscription. Continuing without AI...' 
            };
          }
        }

        const shareCode = nanoid(10);

        yield { type: 'progress', progress: 85, message: 'Saving your wrapped...' };

        const [insertedWrapped] = await db
          .insert(githubWrapped)
          .values({
            userId: ctx.user.id,
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

        yield { type: 'progress', progress: 100, message: 'Your wrapped is ready!' };

        yield {
          type: 'complete',
          data: {
            id: insertedWrapped.id,
            userId: insertedWrapped.userId,
            username: insertedWrapped.username,
            year: insertedWrapped.year,
            stats: insertedWrapped.stats,
            aiInsights: insertedWrapped.aiInsights,
            badgeTheme: insertedWrapped.badgeTheme || 'dark',
            isPublic: insertedWrapped.isPublic ?? true,
            shareCode: insertedWrapped.shareCode,
            createdAt: insertedWrapped.createdAt,
            updatedAt: insertedWrapped.updatedAt,
          },
          cached: false,
        };
      } catch (error) {
        console.error('Error generating wrapped:', error);
        yield {
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate wrapped',
        };
      }
    }),

  generateForFriend: protectedProcedure
    .input(z.object({
      friendUsername: z.string().min(1, 'Friend username is required'),
      year: z.number().optional(),
      personalMessage: z.string().optional(),
    }))
    .subscription(async function* ({ input, ctx }) {
      const year = input.year || new Date().getFullYear();
      const { friendUsername, personalMessage } = input;
      const senderUsername = (ctx.user as { githubUsername?: string }).githubUsername || ctx.user.name || '';

      try {
        yield { type: 'progress', progress: 5, message: 'Checking star status...' };

        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const hasStarred = await githubService.hasStarredRepo(
          GITHUB_GG_REPO.owner,
          GITHUB_GG_REPO.repo
        );

        if (!hasStarred) {
          yield {
            type: 'star_required',
            message: 'Please star github.gg to generate wrapped for friends!',
            repoUrl: GITHUB_GG_REPO.url,
          };
          return;
        }

        yield { type: 'progress', progress: 10, message: `Checking if ${friendUsername} exists...` };

        try {
          await githubService['octokit'].rest.users.getByUsername({ username: friendUsername });
        } catch {
          yield { type: 'error', message: `GitHub user "${friendUsername}" not found` };
          return;
        }

        yield { type: 'progress', progress: 20, message: `Fetching ${friendUsername}'s GitHub activity...` };

        const wrappedService = new WrappedService(githubService['octokit'], year);
        
        let commitAnalysisProgress = 30;
        const progressQueue: ProgressUpdate[] = [];
        
        const { stats, rawData } = await wrappedService.fetchWrappedStats(
          friendUsername,
          (message, metadata) => {
            commitAnalysisProgress = Math.min(commitAnalysisProgress + 5, 55);
            progressQueue.push({ message, metadata });
          }
        );
        
        // Yield all queued progress updates
        for (const update of progressQueue) {
          yield { 
            type: 'progress', 
            progress: commitAnalysisProgress, 
            message: update.message,
            metadata: update.metadata ? {
              commits: update.metadata.commits,
              repos: update.metadata.repos,
              sampleCommits: update.metadata.sampleCommits,
            } : undefined,
          };
        }

        if (stats.totalCommits === 0) {
          yield { type: 'error', message: `${friendUsername} has no commits in ${year}` };
          return;
        }

        yield { type: 'progress', progress: 60, message: 'Crunching the numbers...' };

        const subscription = await getUserSubscription(ctx.user.id);
        const isPro = subscription?.status === 'active' && subscription?.plan === 'pro';
        
        let aiInsights: WrappedAIInsights | null = null;
        
        if (isPro) {
          yield { type: 'progress', progress: 70, message: `🤖 Starting AI analysis for ${friendUsername}...` };
          
          try {
            let finalResult: GenerateWrappedInsightsResult | null = null;
            
            // Use streaming generator for real-time progress
            const insightsGenerator = generateWrappedInsightsStreaming({
              username: friendUsername,
              stats,
              rawData,
              year,
              includeRoast: true,
            });
            
            for await (const update of insightsGenerator) {
              if (update.type === 'progress') {
                // Map AI progress (0-100) to our wrapped progress range (70-79)
                const mappedProgress = 70 + Math.floor((update.progress || 0) * 0.09);
                yield {
                  type: 'progress',
                  progress: mappedProgress,
                  message: update.message || 'AI analyzing...',
                  metadata: update.metadata,
                };
              } else if (update.type === 'stream') {
                // Stream actual AI tokens
                const mappedProgress = 70 + Math.floor((update.progress || 30) * 0.09);
                yield {
                  type: 'progress',
                  progress: mappedProgress,
                  message: update.message || 'AI is thinking...',
                  metadata: {
                    ...update.metadata,
                    streaming: true,
                    textChunk: update.text,
                  },
                };
              } else if (update.type === 'complete' && update.result) {
                finalResult = update.result;
              }
            }
            
            if (!finalResult) {
              throw new Error('AI analysis completed but no result received');
            }
            
            aiInsights = finalResult.insights;
            
            await db.insert(tokenUsage).values({
              userId: ctx.user.id,
              feature: 'wrapped_gift',
              inputTokens: finalResult.usage.inputTokens,
              outputTokens: finalResult.usage.outputTokens,
              totalTokens: finalResult.usage.totalTokens,
              model: 'gemini-3-flash',
              isByok: false,
            });
            
            yield { type: 'progress', progress: 80, message: 'AI analysis complete!' };
          } catch (aiError) {
            console.error('AI insights generation failed:', aiError);
            yield { type: 'progress', progress: 80, message: 'AI analysis skipped. Continuing...' };
          }
        }

        const shareCode = nanoid(10);

        yield { type: 'progress', progress: 85, message: 'Saving wrapped...' };

        const [insertedWrapped] = await db
          .insert(githubWrapped)
          .values({
            userId: ctx.user.id,
            username: friendUsername.toLowerCase(),
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

        yield { type: 'progress', progress: 90, message: 'Sending email notification...' };

        const friendEmail = await db
          .select()
          .from(developerEmails)
          .where(eq(developerEmails.username, friendUsername.toLowerCase()))
          .limit(1);

        let emailSent = false;
        if (friendEmail[0]?.email) {
          try {
            await sendWrappedGiftEmail({
              recipientEmail: friendEmail[0].email,
              recipientUsername: friendUsername,
              senderUsername,
              year,
              personalMessage,
              wrappedUrl: `https://github.gg/wrapped/${year}/${friendUsername}`,
              stats: {
                totalCommits: stats.totalCommits,
                topLanguage: stats.languages[0]?.name || 'Code',
                longestStreak: stats.longestStreak,
              },
            });
            emailSent = true;
          } catch (emailError) {
            console.error('Failed to send wrapped gift email:', emailError);
          }
        }

        const inviteCode = nanoid(10);
        await db.insert(wrappedInvites).values({
          inviterId: ctx.user.id,
          inviterUsername: senderUsername,
          inviteeUsername: friendUsername,
          inviteCode,
          message: personalMessage,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        yield { type: 'progress', progress: 100, message: 'Wrapped gift ready!' };

        yield {
          type: 'complete',
          data: {
            id: insertedWrapped.id,
            username: insertedWrapped.username,
            year: insertedWrapped.year,
            stats: insertedWrapped.stats,
            aiInsights: insertedWrapped.aiInsights,
            shareCode: insertedWrapped.shareCode,
            wrappedUrl: `https://github.gg/wrapped/${year}/${friendUsername}`,
            emailSent,
            inviteCode,
          },
        };
      } catch (error) {
        console.error('Error generating wrapped for friend:', error);
        yield {
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate wrapped for friend',
        };
      }
    }),

  getMyWrapped: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const year = input.year || new Date().getFullYear();

      const wrapped = await db
        .select()
        .from(githubWrapped)
        .where(
          and(
            eq(githubWrapped.userId, ctx.user.id),
            eq(githubWrapped.year, year)
          )
        )
        .orderBy(desc(githubWrapped.createdAt))
        .limit(1);

      if (wrapped.length === 0) {
        return null;
      }

      return wrapped[0];
    }),

  getByUsername: publicProcedure
    .input(z.object({
      username: z.string(),
      year: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();

      const wrapped = await db
        .select()
        .from(githubWrapped)
        .where(
          and(
            eq(githubWrapped.username, input.username.toLowerCase()),
            eq(githubWrapped.year, year),
            eq(githubWrapped.isPublic, true)
          )
        )
        .orderBy(desc(githubWrapped.updatedAt))
        .limit(1);

      if (wrapped.length === 0) {
        return null;
      }

      return wrapped[0];
    }),

  getByShareCode: publicProcedure
    .input(z.object({ shareCode: z.string() }))
    .query(async ({ input }) => {
      const wrapped = await db
        .select()
        .from(githubWrapped)
        .where(eq(githubWrapped.shareCode, input.shareCode))
        .limit(1);

      if (wrapped.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wrapped not found',
        });
      }

      return wrapped[0];
    }),

  getCacheStatus: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const year = input.year || new Date().getFullYear();

      const wrapped = await db
        .select({
          updatedAt: githubWrapped.updatedAt,
          hasAiInsights: githubWrapped.aiInsights,
        })
        .from(githubWrapped)
        .where(
          and(
            eq(githubWrapped.userId, ctx.user.id),
            eq(githubWrapped.year, year)
          )
        )
        .limit(1);

      if (wrapped.length === 0) {
        return { cached: false, canRegenerate: true };
      }

      const timeSinceUpdate = Date.now() - wrapped[0].updatedAt.getTime();
      const hoursAgo = Math.floor(timeSinceUpdate / (1000 * 60 * 60));
      const minutesAgo = Math.floor(timeSinceUpdate / (1000 * 60));
      
      return {
        cached: timeSinceUpdate < CACHE_DURATION_MS,
        lastGenerated: wrapped[0].updatedAt,
        hoursAgo,
        minutesAgo,
        canRegenerate: true,
        hasAiInsights: !!wrapped[0].hasAiInsights,
      };
    }),

  updateVisibility: protectedProcedure
    .input(z.object({
      year: z.number(),
      isPublic: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(githubWrapped)
        .set({ isPublic: input.isPublic })
        .where(
          and(
            eq(githubWrapped.userId, ctx.user.id),
            eq(githubWrapped.year, input.year)
          )
        );

      return { success: true };
    }),

  updateBadgeTheme: protectedProcedure
    .input(z.object({
      year: z.number(),
      theme: z.enum(['dark', 'light', 'transparent']),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(githubWrapped)
        .set({ badgeTheme: input.theme })
        .where(
          and(
            eq(githubWrapped.userId, ctx.user.id),
            eq(githubWrapped.year, input.year)
          )
        );

      return { success: true };
    }),
});
