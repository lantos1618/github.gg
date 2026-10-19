import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { aiSlopAnalyses, tokenUsage } from '@/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { generateAISlopAnalysis, aiSlopSchema } from '@/lib/ai/ai-slop';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForRepo } from '@/lib/github';
import { validatePlanAndKey } from '@/lib/trpc/helpers/validate-plan-and-key';
import { streamProgressWithHeartbeat } from '@/lib/trpc/helpers/stream-progress';
import { repoRefInputSchema } from '@/lib/trpc/helpers/repo-input';
import { createJob, consumeJob } from '@/lib/analysis/job-store';
import { normalizeRepoIdent } from '@/lib/normalize';
import { isPgErrorWithCode } from '@/lib/db/utils';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';

/**
 * AI Slop Detection Router
 *
 * This router uses streaming with heartbeats for real-time progress updates
 * during long-running AI analysis operations.
 */
export const aiSlopRouter = router({
  // Step 1: POST mutation to store file selection
  createAnalysisJob: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional(),
      filePaths: z.array(z.string()).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const jobId = await createJob({
        user: input.user,
        repo: input.repo,
        ref: input.ref,
        filePaths: input.filePaths,
        userId: ctx.user.id,
      });
      return { jobId };
    }),

  // Step 2: SSE subscription with just jobId
  detectAISlop: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .subscription(async function* ({ input, ctx }) {
      const job = await consumeJob(input.jobId, ctx.user.id);
      if (!job) {
        yield { type: 'error', message: 'Analysis job not found or expired. Please try again.' };
        return;
      }

      const { owner: repoOwnerNormalized, repo: repoNameNormalized } = normalizeRepoIdent({
        owner: job.user,
        repo: job.repo,
      });

      try {
        yield { type: 'progress', progress: 0, message: 'Starting AI slop analysis...' };

        yield { type: 'progress', progress: 2, message: 'Verifying subscription...' };
        let keyInfo: { isByok: boolean };
        try {
          ({ keyInfo } = await validatePlanAndKey(ctx.user.id));
        } catch (err) {
          const message = err instanceof TRPCError ? err.message : 'Subscription/key check failed';
          yield { type: 'error', message };
          return;
        }

        yield { type: 'progress', progress: 3, message: 'Authenticating with GitHub...' };

        const githubService = await createGitHubServiceForRepo(job.user, job.repo, ctx.session);
        const repoInfo = await githubService.getRepositoryInfo(job.user, job.repo);

        let ref = job.ref;
        if (!ref || ref === 'main') {
          yield { type: 'progress', progress: 4, message: 'Fetching repository info...' };
          ref = repoInfo.defaultBranch || 'main';
        }

        yield { type: 'progress', progress: 5, message: 'Fetching repository files...' };

        const repoFiles = await githubService.getRepositoryFiles(job.user, job.repo, ref, 500);
        const selectedPaths = job.filePaths.length > 0
          ? new Set(job.filePaths)
          : null;

        const files = repoFiles.files
          .filter(f => f.type === 'file' && f.content)
          .filter(f => !selectedPaths || selectedPaths.has(f.path))
          .filter(f => f.size < 100000)
          .slice(0, 200)
          .map(f => ({ path: f.path, content: f.content!, size: f.size }));

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
          repoName: job.repo,
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

          const currentRepository = await getAccessibleRepositoryInfo(job.user, job.repo, ctx.session);
          if (!currentRepository) throw new Error('Repository access could not be verified before saving');
          const isPrivate = repoInfo.private || currentRepository.private;

          try {
            const results = await db
              .insert(aiSlopAnalyses)
              .values({
                userId: ctx.user.id,
                repoOwner: repoOwnerNormalized,
                repoName: repoNameNormalized,
                ref: ref,
                version: nextVersion,
                isPrivate,
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
          model: 'gemini-3.1-flash', // Primary model used for chunks
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

  // Fetch a cached analysis only when the caller currently has repository access.
  publicGetAISlop: publicProcedure
    .input(repoRefInputSchema)
    .query(async ({ input, ctx }) => {
      const { user, repo, version } = input;
      const { owner: normalizedUser, repo: normalizedRepo } = normalizeRepoIdent({ owner: user, repo });

      const repoInfo = await getAccessibleRepositoryInfo(user, repo, ctx.session);
      if (!repoInfo) {
        return {
          analysis: null,
          cached: false,
          stale: false,
          lastUpdated: null,
          error: 'Unable to access repository',
        };
      }
      const ref = input.ref || repoInfo.defaultBranch || 'main';

      const baseConditions = [
        sql`LOWER(${aiSlopAnalyses.repoOwner}) = ${normalizedUser}`,
        sql`LOWER(${aiSlopAnalyses.repoName}) = ${normalizedRepo}`,
      ];
      if (repoInfo.private && ctx.session?.user?.id) {
        baseConditions.push(eq(aiSlopAnalyses.userId, ctx.session.user.id));
      }
      baseConditions.push(ctx.session?.user?.id
        ? or(eq(aiSlopAnalyses.isPrivate, false), eq(aiSlopAnalyses.userId, ctx.session.user.id))!
        : eq(aiSlopAnalyses.isPrivate, false));
      if (version !== undefined) {
        baseConditions.push(eq(aiSlopAnalyses.version, version));
      }

      const refSpecific = ref
        ? await db
            .select()
            .from(aiSlopAnalyses)
            .where(and(...baseConditions, eq(aiSlopAnalyses.ref, ref)))
            .orderBy(desc(aiSlopAnalyses.updatedAt))
            .limit(1)
        : [];

      // Fall back to ANY ref if requested ref has no rows — guards historical
      // main↔master mismatch in cached records.
      const cached = refSpecific.length > 0
        ? refSpecific
        : await db
            .select()
            .from(aiSlopAnalyses)
            .where(and(...baseConditions))
            .orderBy(desc(aiSlopAnalyses.updatedAt))
            .limit(1);

      if (cached.length > 0) {
        const analysis = cached[0];
        const isStale = new Date().getTime() - analysis.updatedAt.getTime() > 24 * 60 * 60 * 1000;
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
    .query(async ({ input, ctx }) => {
      const repoInfo = await getAccessibleRepositoryInfo(input.user, input.repo, ctx.session);
      if (!repoInfo) return [];
      const { owner: normalizedUser, repo: normalizedRepo } = normalizeRepoIdent({
        owner: input.user,
        repo: input.repo,
      });
      return await db
        .select({ version: aiSlopAnalyses.version, updatedAt: aiSlopAnalyses.updatedAt })
        .from(aiSlopAnalyses)
        .where(
          and(
            sql`LOWER(${aiSlopAnalyses.repoOwner}) = ${normalizedUser}`,
            sql`LOWER(${aiSlopAnalyses.repoName}) = ${normalizedRepo}`,
            eq(aiSlopAnalyses.ref, input.ref),
            ctx.session?.user?.id
              ? or(eq(aiSlopAnalyses.isPrivate, false), eq(aiSlopAnalyses.userId, ctx.session.user.id))!
              : eq(aiSlopAnalyses.isPrivate, false),
            ...(repoInfo.private && ctx.session?.user?.id
              ? [eq(aiSlopAnalyses.userId, ctx.session.user.id)]
              : [])
          )
        )
        .orderBy(desc(aiSlopAnalyses.version));
    }),
});
