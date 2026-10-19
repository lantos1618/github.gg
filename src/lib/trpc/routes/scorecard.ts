import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { repositoryScorecards, tokenUsage } from '@/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { generateScorecardAnalysis } from '@/lib/ai/scorecard';
import { geminiUsageRows } from '@/lib/ai/models';
import { TRPCError } from '@trpc/server';
import { scorecardSchema } from '@/lib/types/scorecard';
import { createGitHubServiceForRepo } from '@/lib/github';
import { executeAnalysisWithVersioning } from '@/lib/trpc/helpers/analysis-executor';
import { validatePlanAndKey } from '@/lib/trpc/helpers/validate-plan-and-key';
import { repoRefInputSchema } from '@/lib/trpc/helpers/repo-input';
import { createJob, consumeJob } from '@/lib/analysis/job-store';
import { generateScorecardEmbedding } from '@/lib/ai/embeddings';
import { normalizeRepoIdent } from '@/lib/normalize';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';

export const scorecardRouter = router({
  // Step 1: POST mutation to store file selection, returns a short jobId
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

  // Step 2: SSE subscription with just the jobId (tiny URL)
  generateScorecard: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .subscription(async function* ({ input, ctx, signal }) {
      const t0 = Date.now();
      const tag = `[scorecard ${ctx.user.id} ${input.jobId.slice(0, 8)}]`;
      const elapsed = () => `${Date.now() - t0}ms`;

      // Yield connection-established event immediately so the client knows the
      // SSE stream is live before any DB/Redis lookup happens. Otherwise a slow
      // consumeJob/Redis call leaves the client stuck on its initial state.
      yield { type: 'progress', progress: 0, message: 'Connected. Loading job...' };

      const job = await consumeJob(input.jobId, ctx.user.id);
      console.log(`${tag} consumeJob ${elapsed()} found=${!!job}`);
      if (!job) {
        yield { type: 'error', message: 'Analysis job not found or expired. Please try again.' };
        return;
      }

      const { owner: repoOwnerNormalized, repo: repoNameNormalized } = normalizeRepoIdent({
        owner: job.user,
        repo: job.repo,
      });

      try {
        yield { type: 'progress', progress: 1, message: 'Checking plan...' };

        let keyInfo: { apiKey: string; isByok: boolean };
        try {
          ({ keyInfo } = await validatePlanAndKey(ctx.user.id));
          console.log(`${tag} validatePlanAndKey ${elapsed()} hasKey=true`);
        } catch (err) {
          const message = err instanceof TRPCError ? err.message : 'Subscription/key check failed';
          console.log(`${tag} validatePlanAndKey failed ${elapsed()} message=${message}`);
          yield { type: 'error', message };
          return;
        }

        yield { type: 'progress', progress: 3, message: 'Authenticating with GitHub...' };

        const githubService = await createGitHubServiceForRepo(job.user, job.repo, ctx.session);
        console.log(`${tag} createGitHubServiceForRepo ${elapsed()}`);

        yield { type: 'progress', progress: 4, message: 'Fetching repository info...' };
        const repoInfo = await githubService.getRepositoryInfo(job.user, job.repo);
        console.log(`${tag} getRepositoryInfo ${elapsed()} private=${repoInfo.private} defaultBranch=${repoInfo.defaultBranch}`);
        const ref = (!job.ref || job.ref === 'main') ? (repoInfo.defaultBranch || 'main') : job.ref;
        const initiallyPrivate = repoInfo.private === true;

        yield { type: 'progress', progress: 5, message: 'Fetching repository files...' };

        // Fetch from tarball (single request) — no file cap, chunker handles sizing
        const repoFiles = await githubService.getRepositoryFiles(job.user, job.repo, ref, 2000);
        const selectedPaths = job.filePaths.length > 0
          ? new Set(job.filePaths)
          : null;

        const files = repoFiles.files
          .filter(f => f.type === 'file' && f.content)
          .filter(f => !selectedPaths || selectedPaths.has(f.path))
          .map(f => ({ path: f.path, content: f.content!, size: f.size }));

        if (!files || files.length === 0) {
          yield { type: 'error', message: 'Failed to fetch any files from GitHub. Please check the repository and file paths.' };
          return;
        }

        yield { type: 'progress', progress: 10, message: `Preparing ${files.length} files for analysis...` };

        // Check if we already have a recent scorecard with the same content
        const existingScorecard = await db
          .select()
          .from(repositoryScorecards)
          .where(and(
            eq(repositoryScorecards.userId, ctx.user.id),
            eq(repositoryScorecards.repoOwner, repoOwnerNormalized),
            eq(repositoryScorecards.repoName, repoNameNormalized),
            eq(repositoryScorecards.ref, ref)
          ))
          .orderBy(desc(repositoryScorecards.version))
          .limit(1);

        // Generate scorecard (auto-chunks large repos with map-reduce).
        // Run in the background and poll the progress queue so we can yield
        // events as they happen. Without this, the client sees a 30s+ silent
        // gap during AI calls, hits its inactivity-reconnect threshold, and
        // restarts the generator from the top in a loop.
        const progressQueue: Array<{ message: string; progress: number }> = [];
        let analysisDone = false;
        let analysisError: unknown = null;
        let analysisResult: Awaited<ReturnType<typeof generateScorecardAnalysis>> | null = null;

        const analysisPromise = generateScorecardAnalysis({
          apiKey: keyInfo.apiKey,
          files,
          repoName: job.repo,
          metadata: {
            description: repoInfo.description,
            stars: repoInfo.stargazersCount,
            forks: repoInfo.forksCount,
            language: repoInfo.language,
            topics: repoInfo.topics,
          },
          abortSignal: signal,
          onProgress: (message, progress) => {
            progressQueue.push({ message, progress });
          },
        }).then(res => {
          analysisResult = res;
          analysisDone = true;
        }).catch(err => {
          analysisError = err;
          analysisDone = true;
        });

        let lastYieldAt = Date.now();
        let lastProgress = 10;
        let lastMessage = `Analyzing ${files.length} files...`;
        const HEARTBEAT_MS = 12_000; // < client reconnectAfterInactivityMs (30_000)

        while (!analysisDone) {
          if (signal?.aborted) {
            // Caller went away; let the background promise settle on its own.
            console.log(`${tag} client aborted at ${elapsed()}`);
            return;
          }

          let yielded = false;
          while (progressQueue.length > 0) {
            const p = progressQueue.shift()!;
            lastProgress = p.progress;
            lastMessage = p.message;
            yield { type: 'progress', progress: lastProgress, message: lastMessage };
            yielded = true;
          }

          if (yielded) {
            lastYieldAt = Date.now();
          } else if (Date.now() - lastYieldAt > HEARTBEAT_MS) {
            yield { type: 'progress', progress: lastProgress, message: lastMessage };
            lastYieldAt = Date.now();
          }

          await new Promise(r => setTimeout(r, 500));
        }
        await analysisPromise;
        // If the client aborted while the AI was running, the background promise
        // rejects with AbortError. Don't surface it as a real error — exit cleanly.
        if (signal?.aborted) {
          console.log(`${tag} client aborted (post-loop) at ${elapsed()}`);
          return;
        }
        if (analysisError) throw analysisError;
        if (!analysisResult) throw new Error('Analysis returned no result');
        const result = analysisResult as Awaited<ReturnType<typeof generateScorecardAnalysis>>;

        // Drain any final progress updates that landed during the await.
        for (const p of progressQueue) {
          yield { type: 'progress', progress: p.progress, message: p.message };
        }
        console.log(`${tag} generation done ${elapsed()}`);

        // Stream token usage to the client as soon as it's known
        if (result?.usage) {
          yield {
            type: 'tokens',
            usage: result.usage,
          };
        }
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
            const usageRows = geminiUsageRows(result.modelUsage).map(({ model, usage }) => ({
              userId: ctx.user.id,
              feature: 'scorecard',
              repoOwner: repoOwnerNormalized,
              repoName: repoNameNormalized,
              model,
              ...usage,
              isByok: keyInfo.isByok,
              createdAt: new Date(),
            }));
            if (usageRows.length > 0) await db.insert(tokenUsage).values(usageRows);

            return;
          }
        }

        // Content changed or no existing version, create new version
        let isPrivate = initiallyPrivate;
        const { insertedRecord } = await executeAnalysisWithVersioning({
          userId: ctx.user.id,
          feature: 'scorecard',
          repoOwner: repoOwnerNormalized,
          repoName: repoNameNormalized,
          table: repositoryScorecards,
          generateFn: async () => {
            const currentInfo = await getAccessibleRepositoryInfo(job.user, job.repo, ctx.session);
            if (!currentInfo) throw new Error('Repository visibility could not be verified before saving scorecard');
            isPrivate = initiallyPrivate || currentInfo.private;
            return { data: parsedData, usage: result.usage, modelUsage: result.modelUsage };
          },
          versioningConditions: [
            eq(repositoryScorecards.userId, ctx.user.id),
            eq(repositoryScorecards.repoOwner, repoOwnerNormalized),
            eq(repositoryScorecards.repoName, repoNameNormalized),
            eq(repositoryScorecards.ref, ref),
          ],
          // `version` is injected atomically by the helper.
          buildInsertValues: (data) => ({
            userId: ctx.user.id,
            repoOwner: repoOwnerNormalized,
            repoName: repoNameNormalized,
            ref: ref,
            isPrivate,
            overallScore: data.overallScore,
            metrics: data.metrics,
            markdown: data.markdown,
            updatedAt: new Date(),
          }),
        });

        // Best-effort: compute + persist embedding for semantic search. Failures
        // here must not break the analysis subscription — embedding is searchable
        // by definition, not load-bearing for the scorecard view itself.
        //
        // Audit R4: bound the background work with a 15s timeout so a slow AI
        // call or hung DB connection can't outlive the request and leak a
        // Vercel pool slot (the pool is only 10 connections). On timeout we
        // log and abandon — backfill scripts re-pick missing embeddings on
        // their next run.
        const BACKGROUND_EMBED_TIMEOUT_MS = 15_000;
        const embeddingPromise = (async () => {
          const embedding = await generateScorecardEmbedding({
            repoOwner: repoOwnerNormalized,
            repoName: repoNameNormalized,
            overallScore: parsedData.overallScore,
            markdown: parsedData.markdown,
          });
          await db
            .update(repositoryScorecards)
            .set({ embedding })
            .where(
              and(
                eq(repositoryScorecards.userId, ctx.user.id),
                eq(repositoryScorecards.repoOwner, repoOwnerNormalized),
                eq(repositoryScorecards.repoName, repoNameNormalized),
                eq(repositoryScorecards.ref, ref),
                eq(repositoryScorecards.version, insertedRecord.version)
              )
            );
        })();
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<'timeout'>((resolve) => {
          timeoutHandle = setTimeout(() => resolve('timeout'), BACKGROUND_EMBED_TIMEOUT_MS);
        });
        void Promise.race([embeddingPromise.then(() => 'ok' as const), timeoutPromise])
          .then((result) => {
            if (result === 'timeout') {
              console.warn(
                `[scorecard.embedding] timed out, abandoning for ${repoOwnerNormalized}/${repoNameNormalized}@${ref}`
              );
            }
          })
          .catch((err) => {
            console.warn(
              `[scorecard.embedding] failed for ${repoOwnerNormalized}/${repoNameNormalized}@${ref}:`,
              err instanceof Error ? err.message : err
            );
          })
          .finally(() => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
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

  // Fetch the latest or a specific version only after checking the repository's
  // current visibility and this caller's current access. Cached privacy flags
  // can be stale when a repository changes visibility or access is revoked.
  publicGetScorecard: publicProcedure
    .input(repoRefInputSchema)
    .query(async ({ input, ctx }) => {
      const { user, repo, version } = input;
      const { owner: normalizedUser, repo: normalizedRepo } = normalizeRepoIdent({ owner: user, repo });
      const ref = input.ref;

      const repoInfo = await getAccessibleRepositoryInfo(user, repo, ctx.session);
      if (!repoInfo) {
        return { scorecard: null, cached: false, stale: false, lastUpdated: null, error: 'Unable to access repository' };
      }

      // Look up cache. Try the resolved ref first; if nothing, fall back to ANY
      // ref for the same repo — guards against historical main↔master mismatches.
      const baseConditions = [
        sql`LOWER(${repositoryScorecards.repoOwner}) = LOWER(${normalizedUser})`,
        sql`LOWER(${repositoryScorecards.repoName}) = ${normalizedRepo}`,
      ];
      if (repoInfo.private && ctx.session?.user?.id) {
        baseConditions.push(eq(repositoryScorecards.userId, ctx.session.user.id));
      } else if (!repoInfo.private) {
        // A scorecard generated while private can still contain old private
        // source even if the repository has since become public.
        baseConditions.push(ctx.session?.user?.id
          ? or(
              eq(repositoryScorecards.isPrivate, false),
              eq(repositoryScorecards.userId, ctx.session.user.id)
            )!
          : eq(repositoryScorecards.isPrivate, false));
      }
      if (version !== undefined) {
        baseConditions.push(eq(repositoryScorecards.version, version));
      }

      const refSpecific = ref
        ? await db
            .select()
            .from(repositoryScorecards)
            .where(and(...baseConditions, eq(repositoryScorecards.ref, ref)))
            .orderBy(desc(repositoryScorecards.updatedAt))
            .limit(1)
        : [];

      const cached = refSpecific.length > 0
        ? refSpecific
        : await db
            .select()
            .from(repositoryScorecards)
            .where(and(...baseConditions))
            .orderBy(desc(repositoryScorecards.updatedAt))
            .limit(1);

      if (cached.length > 0) {
        const scorecard = cached[0];

        const isStale = new Date().getTime() - scorecard.updatedAt.getTime() > 24 * 60 * 60 * 1000;
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

      return { scorecard: null, cached: false, stale: false, lastUpdated: null };
    }),

  getScorecardVersions: publicProcedure
    .input(z.object({ user: z.string(), repo: z.string(), ref: z.string().optional().default('main') }))
    .query(async ({ input, ctx }) => {
      const repoInfo = await getAccessibleRepositoryInfo(input.user, input.repo, ctx.session);
      if (!repoInfo) return [];
      const { owner: normalizedUser, repo: normalizedRepo } = normalizeRepoIdent({
        owner: input.user,
        repo: input.repo,
      });
      return await db
        .select({ version: repositoryScorecards.version, updatedAt: repositoryScorecards.updatedAt })
        .from(repositoryScorecards)
        .where(
          and(
            sql`LOWER(${repositoryScorecards.repoOwner}) = LOWER(${normalizedUser})`,
            sql`LOWER(${repositoryScorecards.repoName}) = ${normalizedRepo}`,
            eq(repositoryScorecards.ref, input.ref),
            ...(repoInfo.private && ctx.session?.user?.id
              ? [eq(repositoryScorecards.userId, ctx.session.user.id)]
              : [ctx.session?.user?.id
                ? or(
                    eq(repositoryScorecards.isPrivate, false),
                    eq(repositoryScorecards.userId, ctx.session.user.id)
                  )!
                : eq(repositoryScorecards.isPrivate, false)])
          )
        )
        .orderBy(desc(repositoryScorecards.version));
    }),

  // Get total count of unique analyzed repos (public only)
  getAnalyzedRepoCount: publicProcedure
    .query(async () => {
      const result = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${repositoryScorecards.repoOwner} || '/' || ${repositoryScorecards.repoName})` })
        .from(repositoryScorecards)
        .where(eq(repositoryScorecards.isPrivate, false));
      return result[0]?.count ?? 0;
    }),

  getAllAnalyzedRepos: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const currentUserId = ctx.session?.user?.id;
      
      const whereCondition = currentUserId
        ? sql`(${repositoryScorecards.isPrivate} = false OR ${repositoryScorecards.userId} = ${currentUserId})`
        : eq(repositoryScorecards.isPrivate, false);
      
      const scorecards = await db.select({
        userId: repositoryScorecards.userId,
        repoOwner: repositoryScorecards.repoOwner,
        repoName: repositoryScorecards.repoName,
        ref: repositoryScorecards.ref,
        overallScore: repositoryScorecards.overallScore,
        metrics: repositoryScorecards.metrics,
        updatedAt: repositoryScorecards.updatedAt,
        version: repositoryScorecards.version,
        isPrivate: repositoryScorecards.isPrivate,
      })
      .from(repositoryScorecards)
      .where(whereCondition)
      .orderBy(desc(repositoryScorecards.updatedAt))
      .limit(input.limit)
      .offset(input.offset);

      const repositoryAccess = new Map<string, { private: boolean } | null>();
      await Promise.all([...new Set(scorecards.map((scorecard) =>
        `${scorecard.repoOwner.toLowerCase()}/${scorecard.repoName.toLowerCase()}`
      ))].map(async (key) => {
        const scorecard = scorecards.find((item) =>
          `${item.repoOwner.toLowerCase()}/${item.repoName.toLowerCase()}` === key
        )!;
        repositoryAccess.set(key, await getAccessibleRepositoryInfo(
          scorecard.repoOwner, scorecard.repoName, ctx.session
        ));
      }));

      const latestRepos = new Map<string, typeof scorecards[0]>();
      for (const scorecard of scorecards) {
        const accessKey = `${scorecard.repoOwner.toLowerCase()}/${scorecard.repoName.toLowerCase()}`;
        const access = repositoryAccess.get(accessKey);
        if (!access || (access.private && scorecard.userId !== currentUserId)) continue;
        const key = `${scorecard.repoOwner}/${scorecard.repoName}/${scorecard.ref}`;
        const existing = latestRepos.get(key);
        if (!existing || scorecard.version > existing.version) {
          latestRepos.set(key, scorecard);
        }
      }

      return Array.from(latestRepos.values())
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map(({ userId: _userId, ...scorecard }) => scorecard);
    }),

});
