import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { repositoryScorecards, tokenUsage } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateScorecardAnalysis } from '@/lib/ai/scorecard';
import { TRPCError } from '@trpc/server';
import { scorecardSchema } from '@/lib/types/scorecard';
import { createGitHubServiceFromSession } from '@/lib/github';
import { executeAnalysisWithVersioning } from '@/lib/trpc/helpers/analysis-executor';
import { fetchFilesByPaths } from '@/lib/github/file-fetcher';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';

export const scorecardRouter = router({
  generateScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      filePaths: z.array(z.string()),
    }))
    .subscription(async function* ({ input, ctx }) {
      try {
        yield { type: 'progress', progress: 0, message: 'Starting scorecard analysis...' };

        // Validate filePaths
        if (!input.filePaths || input.filePaths.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No files selected for analysis. Please select at least one file.'
          });
        }

        yield { type: 'progress', progress: 5, message: `Fetching ${input.filePaths.length} files from GitHub...` };

        // Fetch file contents from GitHub
        const files = await fetchFilesByPaths(input.user, input.repo, input.filePaths, input.ref);

        if (!files || files.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to fetch any files from GitHub. Please check the repository and file paths.'
          });
        }

        yield { type: 'progress', progress: 15, message: `Analyzing ${files.length} files...` };

        // Check if we already have a recent scorecard with the same content
        const existingScorecard = await db
          .select()
          .from(repositoryScorecards)
          .where(and(
            eq(repositoryScorecards.userId, ctx.user.id),
            eq(repositoryScorecards.repoOwner, input.user),
            eq(repositoryScorecards.repoName, input.repo),
            eq(repositoryScorecards.ref, input.ref || 'main')
          ))
          .orderBy(desc(repositoryScorecards.version))
          .limit(1);

        // Generate new scorecard
        const result = await generateScorecardAnalysis({
          files,
          repoName: input.repo,
        });
        const parsedData = scorecardSchema.parse(result.scorecard);

        // Check if content is identical to the most recent version
        if (existingScorecard[0]) {
          const existing = existingScorecard[0];
          const contentChanged =
            existing.overallScore !== parsedData.overallScore ||
            JSON.stringify(existing.metrics) !== JSON.stringify(parsedData.metrics) ||
            existing.markdown !== parsedData.markdown;

          if (!contentChanged) {
            // Content is identical, return existing record without creating new version
            yield { type: 'progress', progress: 80, message: 'Analysis complete (no changes detected)...' };

            yield {
              type: 'complete',
              data: {
                scorecard: {
                  metrics: existing.metrics,
                  markdown: existing.markdown,
                  overallScore: existing.overallScore,
                },
                cached: true,
                stale: false,
                lastUpdated: existing.updatedAt || new Date(),
              },
            };

            // Still log token usage even though we didn't create a new version
            const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
            const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');

            await db.insert(tokenUsage).values({
              userId: ctx.user.id,
              feature: 'scorecard',
              repoOwner: input.user,
              repoName: input.repo,
              model: 'gemini-2.5-pro',
              inputTokens: result.usage.inputTokens,
              outputTokens: result.usage.outputTokens,
              totalTokens: result.usage.totalTokens,
              isByok: keyInfo?.isByok || false,
              createdAt: new Date(),
            });

            return;
          }
        }

        // Content changed or no existing version, create new version
        const { insertedRecord } = await executeAnalysisWithVersioning({
          userId: ctx.user.id,
          feature: 'scorecard',
          repoOwner: input.user,
          repoName: input.repo,
          table: repositoryScorecards,
          generateFn: async () => ({
            data: parsedData,
            usage: result.usage,
          }),
          versioningConditions: [
            eq(repositoryScorecards.userId, ctx.user.id),
            eq(repositoryScorecards.repoOwner, input.user),
            eq(repositoryScorecards.repoName, input.repo),
            eq(repositoryScorecards.ref, input.ref || 'main'),
          ],
          buildInsertValues: (data, version) => ({
            userId: ctx.user.id,
            repoOwner: input.user,
            repoName: input.repo,
            ref: input.ref || 'main',
            version,
            overallScore: data.overallScore,
            metrics: data.metrics,
            markdown: data.markdown,
            updatedAt: new Date(),
          }),
        });

        yield { type: 'progress', progress: 80, message: 'Analysis complete, saving results...' };

        yield {
          type: 'complete',
          data: {
            scorecard: {
              metrics: insertedRecord.metrics,
              markdown: insertedRecord.markdown,
              overallScore: insertedRecord.overallScore,
            },
            cached: false,
            stale: false,
            lastUpdated: insertedRecord.updatedAt || new Date(),
          },
        };
      } catch (error) {
        console.error('🔥 Raw error in scorecard route:', error);
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate repository scorecard';
        yield { type: 'error', message: userFriendlyMessage };
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userFriendlyMessage });
      }
    }),

  // Unified public endpoint: fetch latest or specific version of a scorecard for a repo/ref
  publicGetScorecard: publicProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      version: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { user, repo, ref, version } = input;
      
      // Check repository access and privacy
      try {
        const githubService = await createGitHubServiceFromSession(ctx.session);
        const repoInfo = await githubService.getRepositoryInfo(user, repo);
        
        // If the repository is private, check if user has access
        if (repoInfo.private === true) {
          // If user is not authenticated, block access
          if (!ctx.session?.user) {
            return {
              scorecard: null,
              cached: false,
              stale: false,
              lastUpdated: null,
              error: 'This repository is private'
            };
          }
          
          // User is authenticated, so they should have access (since we successfully fetched repo info)
          // Continue to show the scorecard
        }
      } catch {
        // If we can't access the repo (404 or no auth), it might be private or user doesn't have access
        return {
          scorecard: null,
          cached: false,
          stale: false,
          lastUpdated: null,
          error: 'Unable to access repository'
        };
      }
      
      const baseConditions = [
        eq(repositoryScorecards.repoOwner, user),
        eq(repositoryScorecards.repoName, repo),
        eq(repositoryScorecards.ref, ref),
      ];
      if (version !== undefined) {
        baseConditions.push(eq(repositoryScorecards.version, version));
      }
      const cached = await db
        .select()
        .from(repositoryScorecards)
        .where(and(...baseConditions))
        .orderBy(desc(repositoryScorecards.updatedAt))
        .limit(1);
      if (cached.length > 0) {
        const scorecard = cached[0];
        const isStale = new Date().getTime() - scorecard.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        return {
          scorecard: {
            metrics: scorecard.metrics,
            markdown: scorecard.markdown,
            overallScore: scorecard.overallScore,
          },
          cached: true,
          stale: isStale,
          lastUpdated: scorecard.updatedAt,
        };
      }
      return {
        scorecard: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  getScorecardVersions: publicProcedure
    .input(z.object({ user: z.string(), repo: z.string(), ref: z.string().optional().default('main') }))
    .query(async ({ input }) => {
      return await db
        .select({ version: repositoryScorecards.version, updatedAt: repositoryScorecards.updatedAt })
        .from(repositoryScorecards)
        .where(
          and(
            eq(repositoryScorecards.repoOwner, input.user),
            eq(repositoryScorecards.repoName, input.repo),
            eq(repositoryScorecards.ref, input.ref)
          )
        )
        .orderBy(desc(repositoryScorecards.version));
    }),

  getAllAnalyzedRepos: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const scorecards = await db.select({
        repoOwner: repositoryScorecards.repoOwner,
        repoName: repositoryScorecards.repoName,
        ref: repositoryScorecards.ref,
        overallScore: repositoryScorecards.overallScore,
        metrics: repositoryScorecards.metrics,
        updatedAt: repositoryScorecards.updatedAt,
        version: repositoryScorecards.version,
      })
      .from(repositoryScorecards)
      .orderBy(desc(repositoryScorecards.updatedAt))
      .limit(input.limit)
      .offset(input.offset);

      // Group by repo (owner + name + ref) and take latest version
      const latestRepos = new Map<string, typeof scorecards[0]>();
      for (const scorecard of scorecards) {
        const key = `${scorecard.repoOwner}/${scorecard.repoName}/${scorecard.ref}`;
        const existing = latestRepos.get(key);
        if (!existing || scorecard.version > existing.version) {
          latestRepos.set(key, scorecard);
        }
      }

      return Array.from(latestRepos.values()).sort((a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    }),

});
