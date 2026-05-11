import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { securityReviews, tokenUsage } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { generateSecurityReview } from '@/lib/ai/security-review';
import { securityReviewSchema } from '@/lib/types/security-review';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForRepo } from '@/lib/github';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { createJob, consumeJob } from '@/lib/analysis/job-store';
import { isPgErrorWithCode } from '@/lib/db/utils';
import { checkRepositoryWriteAccess } from '@/lib/wiki/permissions';

async function* streamProgressWithHeartbeat(
  promise: Promise<unknown>,
  progressQueue: Array<{ message: string; progress: number }>,
  heartbeatInterval = 2000,
): AsyncGenerator<
  { type: 'progress'; message: string; progress: number } | { type: 'ping' },
  void,
  unknown
> {
  let done = false;
  promise.then(() => { done = true; }).catch(() => { done = true; });

  while (!done) {
    while (progressQueue.length > 0) {
      const event = progressQueue.shift()!;
      yield { type: 'progress', message: event.message, progress: event.progress };
    }
    yield { type: 'ping' };
    await new Promise(r => setTimeout(r, heartbeatInterval));
  }

  while (progressQueue.length > 0) {
    const event = progressQueue.shift()!;
    yield { type: 'progress', message: event.message, progress: event.progress };
  }
}

export const securityReviewRouter = router({
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

  generateSecurityReview: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .subscription(async function* ({ input, ctx }) {
      const job = await consumeJob(input.jobId, ctx.user.id);
      if (!job) {
        yield { type: 'error', message: 'Analysis job not found or expired. Please try again.' };
        return;
      }

      const repoOwnerNormalized = job.user.toLowerCase();
      const repoNameNormalized = job.repo.toLowerCase();

      try {
        yield { type: 'progress', progress: 0, message: 'Starting vulnerability scan...' };

        // Only repo owner/contributors can run a vulnerability scan.
        const hasAccess = await checkRepositoryWriteAccess(ctx.session, job.user, job.repo);
        if (!hasAccess) {
          yield {
            type: 'error',
            message: 'Only the repository owner or contributors can run vulnerability scans',
          };
          return;
        }

        yield { type: 'progress', progress: 2, message: 'Verifying subscription...' };
        const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
        if (!subscription || subscription.status !== 'active') {
          yield { type: 'error', message: 'Active subscription required for AI features' };
          return;
        }

        const keyInfo = await getApiKeyForUser(ctx.user.id, plan);
        if (!keyInfo) {
          yield { type: 'error', message: 'Please add your Gemini API key in settings to use this feature' };
          return;
        }

        yield { type: 'progress', progress: 3, message: 'Authenticating with GitHub...' };

        const githubService = await createGitHubServiceForRepo(job.user, job.repo, ctx.session);

        let ref = job.ref;
        if (!ref || ref === 'main') {
          yield { type: 'progress', progress: 4, message: 'Fetching repository info...' };
          const repoInfo = await githubService.getRepositoryInfo(job.user, job.repo);
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

        yield { type: 'progress', progress: 10, message: `Reviewing ${files.length} files for security issues...` };

        const progressQueue: Array<{ message: string; progress: number }> = [];

        const analysisPromise = generateSecurityReview({
          files,
          repoName: job.repo,
          onProgress: (message, progress) => {
            progressQueue.push({ message, progress });
          },
        });

        for await (const event of streamProgressWithHeartbeat(analysisPromise, progressQueue)) {
          if (event.type === 'progress') {
            yield { type: 'progress', progress: event.progress, message: event.message };
          } else if (event.type === 'ping') {
            yield { type: 'ping' };
          }
        }

        const result = await analysisPromise;
        const reviewData = securityReviewSchema.parse(result.review);

        yield { type: 'progress', progress: 85, message: 'Saving security profile...' };

        const maxRetries = 5;
        let insertedRecord: typeof securityReviews.$inferSelect | null = null;

        for (let attempt = 0; attempt < maxRetries && !insertedRecord; attempt++) {
          const maxVersionResult = await db
            .select({ max: sql`MAX(version)` })
            .from(securityReviews)
            .where(and(
              eq(securityReviews.userId, ctx.user.id),
              eq(securityReviews.repoOwner, repoOwnerNormalized),
              eq(securityReviews.repoName, repoNameNormalized),
              eq(securityReviews.ref, ref),
            ));

          const rawMax = maxVersionResult[0]?.max;
          const maxVersion = typeof rawMax === 'number' ? rawMax : Number(rawMax) || 0;
          const nextVersion = maxVersion + 1;

          try {
            const results = await db
              .insert(securityReviews)
              .values({
                userId: ctx.user.id,
                repoOwner: repoOwnerNormalized,
                repoName: repoNameNormalized,
                ref: ref,
                version: nextVersion,
                overallScore: reviewData.overallScore,
                riskLevel: reviewData.riskLevel,
                vulnerabilities: reviewData.vulnerabilities,
                attackSurface: reviewData.attackSurface,
                metrics: reviewData.metrics,
                markdown: reviewData.markdown,
                updatedAt: new Date(),
              })
              .onConflictDoNothing()
              .returning();

            if (results.length > 0 && results[0]) {
              insertedRecord = results[0];
            }
          } catch (e: unknown) {
            if (isPgErrorWithCode(e) && e.code === '23505') {
              continue;
            }
            throw e;
          }
        }

        if (!insertedRecord) {
          throw new Error(`Failed to save security review after ${maxRetries} attempts`);
        }

        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'security-review',
          repoOwner: repoOwnerNormalized,
          repoName: repoNameNormalized,
          model: 'gemini-3.1-flash-lite-preview',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });

        yield { type: 'progress', progress: 95, message: 'Security review complete!' };

        yield {
          type: 'complete',
          data: {
            review: {
              metrics: insertedRecord.metrics,
              markdown: insertedRecord.markdown,
              overallScore: insertedRecord.overallScore,
              riskLevel: insertedRecord.riskLevel,
              vulnerabilities: insertedRecord.vulnerabilities,
              attackSurface: insertedRecord.attackSurface,
            },
            cached: false,
            stale: false,
            lastUpdated: insertedRecord.updatedAt || new Date(),
          },
        };
      } catch (error) {
        console.error('🔥 Raw error in security-review route:', error);
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate security review';
        yield { type: 'error', message: userFriendlyMessage };
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userFriendlyMessage });
      }
    }),

  publicGetSecurityReview: publicProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional(),
      version: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { user, repo, version } = input;
      const normalizedUser = user.toLowerCase();
      const normalizedRepo = repo.toLowerCase();

      // Vulnerability data is sensitive — only the repo owner/contributors
      // (anyone with push/admin) can see findings, even on public repos.
      if (!ctx.session?.user) {
        return {
          review: null,
          cached: false,
          stale: false,
          lastUpdated: null,
          error: 'Sign in as a repository contributor to view vulnerabilities',
        };
      }

      const hasAccess = await checkRepositoryWriteAccess(ctx.session, user, repo);
      if (!hasAccess) {
        return {
          review: null,
          cached: false,
          stale: false,
          lastUpdated: null,
          error: 'Only the repository owner or contributors can view vulnerability scans',
        };
      }

      let ref = input.ref;
      try {
        const githubService = await createGitHubServiceForRepo(user, repo, ctx.session);
        const repoInfo = await githubService.getRepositoryInfo(user, repo);
        if (!ref) ref = repoInfo.defaultBranch || 'main';
      } catch (err) {
        const message = (err as { message?: string })?.message;
        console.warn(`[publicGetSecurityReview ${normalizedUser}/${normalizedRepo}] repo info fetch failed (will still try cache):`, message);
      }

      const baseConditions = [
        sql`LOWER(${securityReviews.repoOwner}) = ${normalizedUser}`,
        sql`LOWER(${securityReviews.repoName}) = ${normalizedRepo}`,
      ];
      if (version !== undefined) {
        baseConditions.push(eq(securityReviews.version, version));
      }

      const refSpecific = ref
        ? await db
            .select()
            .from(securityReviews)
            .where(and(...baseConditions, eq(securityReviews.ref, ref)))
            .orderBy(desc(securityReviews.updatedAt))
            .limit(1)
        : [];

      const cached = refSpecific.length > 0
        ? refSpecific
        : await db
            .select()
            .from(securityReviews)
            .where(and(...baseConditions))
            .orderBy(desc(securityReviews.updatedAt))
            .limit(1);

      if (cached.length > 0) {
        const review = cached[0];
        const isStale = new Date().getTime() - review.updatedAt.getTime() > 24 * 60 * 60 * 1000;
        return {
          review: {
            metrics: review.metrics,
            markdown: review.markdown,
            overallScore: review.overallScore,
            riskLevel: review.riskLevel,
            vulnerabilities: review.vulnerabilities,
            attackSurface: review.attackSurface,
          },
          cached: true,
          stale: isStale,
          lastUpdated: review.updatedAt,
        };
      }
      return {
        review: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  getSecurityReviewVersions: publicProcedure
    .input(z.object({ user: z.string(), repo: z.string(), ref: z.string().optional().default('main') }))
    .query(async ({ input, ctx }) => {
      const normalizedUser = input.user.toLowerCase();
      const normalizedRepo = input.repo.toLowerCase();

      // Same ACL as publicGetSecurityReview — versions list leaks the
      // existence/freshness of scans, so it must follow the same rule.
      if (!ctx.session?.user) return [];
      const hasAccess = await checkRepositoryWriteAccess(ctx.session, input.user, input.repo);
      if (!hasAccess) return [];

      return await db
        .select({ version: securityReviews.version, updatedAt: securityReviews.updatedAt })
        .from(securityReviews)
        .where(
          and(
            sql`LOWER(${securityReviews.repoOwner}) = ${normalizedUser}`,
            sql`LOWER(${securityReviews.repoName}) = ${normalizedRepo}`,
            eq(securityReviews.ref, input.ref),
          ),
        )
        .orderBy(desc(securityReviews.version));
    }),
});
