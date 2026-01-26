import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { aiSlopAnalyses, tokenUsage } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { generateAISlopAnalysis, aiSlopSchema } from '@/lib/ai/ai-slop';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceFromSession } from '@/lib/github';
import { fetchFilesByPaths } from '@/lib/github/file-fetcher';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { isPgErrorWithCode } from '@/lib/db/utils';

/**
 * Helper to stream progress events and heartbeats while waiting for a promise.
 * Yields progress events from the queue and heartbeat pings to keep SSE alive.
 */
async function* streamProgressWithHeartbeat(
  promise: Promise<unknown>,
  progressQueue: Array<{ message: string; progress: number }>,
  heartbeatInterval = 2000
): AsyncGenerator<
  { type: 'progress'; message: string; progress: number } | { type: 'ping' },
  void,
  unknown
> {
  let done = false;
  promise.then(() => { done = true; }).catch(() => { done = true; });

  while (!done) {
    // Yield any queued progress events
    while (progressQueue.length > 0) {
      const event = progressQueue.shift()!;
      yield { type: 'progress', message: event.message, progress: event.progress };
    }
    // Yield heartbeat to keep connection alive
    yield { type: 'ping' };
    // Wait before next check
    await new Promise(r => setTimeout(r, heartbeatInterval));
  }

  // Yield any remaining progress events after completion
  while (progressQueue.length > 0) {
    const event = progressQueue.shift()!;
    yield { type: 'progress', message: event.message, progress: event.progress };
  }
}

/**
 * AI Slop Detection Router
 *
 * This router uses streaming with heartbeats for real-time progress updates
 * during long-running AI analysis operations.
 */
export const aiSlopRouter = router({
  detectAISlop: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      filePaths: z.array(z.string()),
    }))
    .subscription(async function* ({ input, ctx }) {
      // Normalize username and repo to lowercase for database storage (case-insensitive)
      // Keep original casing for GitHub API calls
      const repoOwnerNormalized = input.user.toLowerCase();
      const repoNameNormalized = input.repo.toLowerCase();

      try {
        yield { type: 'progress', progress: 0, message: 'Starting AI slop analysis...' };

        // Validate filePaths
        if (!input.filePaths || input.filePaths.length === 0) {
          yield { type: 'error', message: 'No files selected for analysis. Please select at least one file.' };
          return;
        }

        // Check for active subscription
        yield { type: 'progress', progress: 2, message: 'Verifying subscription...' };
        const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
        if (!subscription || subscription.status !== 'active') {
          yield { type: 'error', message: 'Active subscription required for AI features' };
          return;
        }

        // Get appropriate API key
        const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
        if (!keyInfo) {
          yield { type: 'error', message: 'Please add your Gemini API key in settings to use this feature' };
          return;
        }

        yield { type: 'progress', progress: 3, message: 'Authenticating with GitHub...' };

        // Create authenticated GitHub service
        const githubService = await createGitHubServiceFromSession(ctx.session);

        // Fetch repo info to get actual default branch if not provided
        let ref = input.ref;
        if (!ref || ref === 'main') {
          yield { type: 'progress', progress: 4, message: 'Fetching repository info...' };
          const repoInfo = await githubService.getRepositoryInfo(input.user, input.repo);
          ref = repoInfo.defaultBranch || 'main';
        }

        yield { type: 'progress', progress: 5, message: `Fetching ${input.filePaths.length} files from GitHub...` };

        // Fetch file contents from GitHub (use original casing for API)
        const files = await fetchFilesByPaths(input.user, input.repo, input.filePaths, githubService, ref);

        if (!files || files.length === 0) {
          yield { type: 'error', message: 'Failed to fetch any files from GitHub. Please check the repository and file paths.' };
          return;
        }

        yield { type: 'progress', progress: 10, message: `Analyzing ${files.length} files with AI...` };

        // Progress queue for streaming updates from AI generation
        const progressQueue: Array<{ message: string; progress: number }> = [];

        // Start AI analysis with progress callback
        const analysisPromise = generateAISlopAnalysis({
          files,
          repoName: input.repo,
          onProgress: (message, progress) => {
            progressQueue.push({ message, progress });
          },
        });

        // Stream progress and heartbeats while AI runs
        for await (const event of streamProgressWithHeartbeat(analysisPromise, progressQueue)) {
          if (event.type === 'progress') {
            yield { type: 'progress', progress: event.progress, message: event.message };
          } else if (event.type === 'ping') {
            yield { type: 'ping' };
          }
        }

        // Get the analysis result
        const result = await analysisPromise;
        const analysisData = aiSlopSchema.parse(result.analysis);

        yield { type: 'progress', progress: 85, message: 'Saving results...' };

        // Versioned database insertion with conflict retry
        const maxRetries = 5;
        let insertedRecord: typeof aiSlopAnalyses.$inferSelect | null = null;

        for (let attempt = 0; attempt < maxRetries && !insertedRecord; attempt++) {
          // Get current max version for this analysis group
          const maxVersionResult = await db
            .select({ max: sql`MAX(version)` })
            .from(aiSlopAnalyses)
            .where(and(
              eq(aiSlopAnalyses.userId, ctx.user.id),
              eq(aiSlopAnalyses.repoOwner, repoOwnerNormalized),
              eq(aiSlopAnalyses.repoName, repoNameNormalized),
              eq(aiSlopAnalyses.ref, ref),
            ));

          const rawMax = maxVersionResult[0]?.max;
          const maxVersion = typeof rawMax === 'number' ? rawMax : Number(rawMax) || 0;
          const nextVersion = maxVersion + 1;

          try {
            const results = await db
              .insert(aiSlopAnalyses)
              .values({
                userId: ctx.user.id,
                repoOwner: repoOwnerNormalized,
                repoName: repoNameNormalized,
                ref: ref,
                version: nextVersion,
                overallScore: analysisData.overallScore,
                aiGeneratedPercentage: analysisData.aiGeneratedPercentage,
                detectedPatterns: analysisData.detectedPatterns,
                metrics: analysisData.metrics,
                markdown: analysisData.markdown,
                updatedAt: new Date(),
              })
              .onConflictDoNothing()
              .returning();

            if (results.length > 0 && results[0]) {
              insertedRecord = results[0];
            }
          } catch (e: unknown) {
            // If unique constraint violation, retry
            if (isPgErrorWithCode(e) && e.code === '23505') {
              continue;
            }
            throw e;
          }
        }

        if (!insertedRecord) {
          throw new Error(`Failed to save analysis after ${maxRetries} attempts`);
        }

        // Log token usage
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'ai-slop',
          repoOwner: repoOwnerNormalized,
          repoName: repoNameNormalized,
          model: 'gemini-2.5-flash', // Primary model used for chunks
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });

        yield { type: 'progress', progress: 95, message: 'Analysis complete!' };

        yield {
          type: 'complete',
          data: {
            analysis: {
              metrics: insertedRecord.metrics,
              markdown: insertedRecord.markdown,
              overallScore: insertedRecord.overallScore,
              aiGeneratedPercentage: insertedRecord.aiGeneratedPercentage,
              detectedPatterns: insertedRecord.detectedPatterns,
            },
            cached: false,
            stale: false,
            lastUpdated: insertedRecord.updatedAt || new Date(),
          },
        };
      } catch (error) {
        console.error('🔥 Raw error in AI slop route:', error);
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate AI slop analysis';
        yield { type: 'error', message: userFriendlyMessage };
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userFriendlyMessage });
      }
    }),

  // Unified public endpoint: fetch latest or specific version of an AI slop analysis
  publicGetAISlop: publicProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      version: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { user, repo, ref, version } = input;
      const normalizedUser = user.toLowerCase();
      const normalizedRepo = repo.toLowerCase();

      // Check repository access and privacy
      try {
        const githubService = await createGitHubServiceFromSession(ctx.session);
        const repoInfo = await githubService.getRepositoryInfo(user, repo);

        // If the repository is private, check if user has access
        if (repoInfo.private === true) {
          // If user is not authenticated, block access
          if (!ctx.session?.user) {
            return {
              analysis: null,
              cached: false,
              stale: false,
              lastUpdated: null,
              error: 'This repository is private'
            };
          }

          // User is authenticated, so they should have access (since we successfully fetched repo info)
          // Continue to show the analysis
        }
      } catch {
        // If we can't access the repo (404 or no auth), it might be private or user doesn't have access
        return {
          analysis: null,
          cached: false,
          stale: false,
          lastUpdated: null,
          error: 'Unable to access repository'
        };
      }

      // Use case-insensitive comparison for repoOwner/repoName
      const baseConditions = [
        sql`LOWER(${aiSlopAnalyses.repoOwner}) = ${normalizedUser}`,
        sql`LOWER(${aiSlopAnalyses.repoName}) = ${normalizedRepo}`,
        eq(aiSlopAnalyses.ref, ref),
      ];
      if (version !== undefined) {
        baseConditions.push(eq(aiSlopAnalyses.version, version));
      }
      const cached = await db
        .select()
        .from(aiSlopAnalyses)
        .where(and(...baseConditions))
        .orderBy(desc(aiSlopAnalyses.updatedAt))
        .limit(1);
      if (cached.length > 0) {
        const analysis = cached[0];
        const isStale = new Date().getTime() - analysis.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        return {
          analysis: {
            metrics: analysis.metrics,
            markdown: analysis.markdown,
            overallScore: analysis.overallScore,
            aiGeneratedPercentage: analysis.aiGeneratedPercentage,
            detectedPatterns: analysis.detectedPatterns,
          },
          cached: true,
          stale: isStale,
          lastUpdated: analysis.updatedAt,
        };
      }
      return {
        analysis: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  getAISlopVersions: publicProcedure
    .input(z.object({ user: z.string(), repo: z.string(), ref: z.string().optional().default('main') }))
    .query(async ({ input }) => {
      const normalizedUser = input.user.toLowerCase();
      const normalizedRepo = input.repo.toLowerCase();
      return await db
        .select({ version: aiSlopAnalyses.version, updatedAt: aiSlopAnalyses.updatedAt })
        .from(aiSlopAnalyses)
        .where(
          and(
            sql`LOWER(${aiSlopAnalyses.repoOwner}) = ${normalizedUser}`,
            sql`LOWER(${aiSlopAnalyses.repoName}) = ${normalizedRepo}`,
            eq(aiSlopAnalyses.ref, input.ref)
          )
        )
        .orderBy(desc(aiSlopAnalyses.version));
    }),
});
