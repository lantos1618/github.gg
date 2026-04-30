import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { repositoryScorecards, tokenUsage } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { generateScorecardAnalysis } from '@/lib/ai/scorecard';
import { TRPCError } from '@trpc/server';
import { scorecardSchema } from '@/lib/types/scorecard';
import { createGitHubServiceForRepo } from '@/lib/github';
import { executeAnalysisWithVersioning } from '@/lib/trpc/helpers/analysis-executor';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { createJob, consumeJob } from '@/lib/analysis/job-store';

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

      const repoOwnerNormalized = job.user.toLowerCase();
      const repoNameNormalized = job.repo.toLowerCase();

      try {
        yield { type: 'progress', progress: 1, message: 'Checking plan...' };

        const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
        console.log(`${tag} getUserPlanAndKey ${elapsed()} plan=${plan} active=${subscription?.status}`);
        if (!subscription || subscription.status !== 'active') {
          yield { type: 'error', message: 'Active subscription required for AI features' };
          return;
        }
        const keyInfo = await getApiKeyForUser(ctx.user.id, plan);
        console.log(`${tag} getApiKeyForUser ${elapsed()} hasKey=${!!keyInfo}`);
        if (!keyInfo) {
          yield { type: 'error', message: 'Please add your Gemini API key in settings to use this feature' };
          return;
        }

        yield { type: 'progress', progress: 3, message: 'Authenticating with GitHub...' };

        const githubService = await createGitHubServiceForRepo(job.user, job.repo, ctx.session);
        console.log(`${tag} createGitHubServiceForRepo ${elapsed()}`);

        yield { type: 'progress', progress: 4, message: 'Fetching repository info...' };
        const repoInfo = await githubService.getRepositoryInfo(job.user, job.repo);
        console.log(`${tag} getRepositoryInfo ${elapsed()} private=${repoInfo.private} defaultBranch=${repoInfo.defaultBranch}`);
        const ref = (!job.ref || job.ref === 'main') ? (repoInfo.defaultBranch || 'main') : job.ref;
        const isPrivate = repoInfo.private === true;

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
            await db.insert(tokenUsage).values({
              userId: ctx.user.id,
              feature: 'scorecard',
              repoOwner: repoOwnerNormalized,
              repoName: repoNameNormalized,
              model: 'gemini-3.1-pro-preview',
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
          repoOwner: repoOwnerNormalized,
          repoName: repoNameNormalized,
          table: repositoryScorecards,
          generateFn: async () => ({
            data: parsedData,
            usage: result.usage,
          }),
          versioningConditions: [
            eq(repositoryScorecards.userId, ctx.user.id),
            eq(repositoryScorecards.repoOwner, repoOwnerNormalized),
            eq(repositoryScorecards.repoName, repoNameNormalized),
            eq(repositoryScorecards.ref, ref),
          ],
          buildInsertValues: (data, version) => ({
            userId: ctx.user.id,
            repoOwner: repoOwnerNormalized,
            repoName: repoNameNormalized,
            ref: ref,
            version,
            isPrivate,
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

  // Unified public endpoint: fetch latest or specific version of a scorecard for a repo/ref.
  //
  // Cached scorecards are the source of truth — never block returning them on a
  // live GitHub API call. The previous implementation called getRepositoryInfo
  // first to resolve the default branch and check privacy, and a flake there
  // (rate limit, revoked install, etc.) caused the whole query to return
  // "Unable to access repository" while the cached scorecard sat in the DB.
  publicGetScorecard: publicProcedure
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

      // Resolve ref + privacy from GitHub, but treat failures as soft —
      // we can still serve the cached scorecard.
      let ref = input.ref;
      let repoIsPrivate: boolean | null = null;
      try {
        const githubService = await createGitHubServiceForRepo(user, repo, ctx.session);
        const repoInfo = await githubService.getRepositoryInfo(user, repo);
        repoIsPrivate = repoInfo.private === true;
        if (!ref) ref = repoInfo.defaultBranch || 'main';
      } catch (err) {
        const message = (err as { message?: string })?.message;
        console.warn(`[publicGetScorecard ${normalizedUser}/${normalizedRepo}] repo info fetch failed (will still try cache):`, message);
      }

      // Block content for verified-private repos when caller isn't signed in.
      // If we couldn't determine privacy, err on the side of trusting the cache —
      // the only way a scorecard ends up there is if a signed-in user generated it.
      if (repoIsPrivate === true && !ctx.session?.user) {
        return { scorecard: null, cached: false, stale: false, lastUpdated: null, error: 'This repository is private' };
      }

      // Look up cache. Try the resolved ref first; if nothing, fall back to ANY
      // ref for the same repo — guards against historical main↔master mismatches.
      const baseConditions = [
        sql`LOWER(${repositoryScorecards.repoOwner}) = LOWER(${normalizedUser})`,
        sql`LOWER(${repositoryScorecards.repoName}) = ${normalizedRepo}`,
      ];
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
    .query(async ({ input }) => {
      const normalizedUser = input.user.toLowerCase();
      const normalizedRepo = input.repo.toLowerCase();
      return await db
        .select({ version: repositoryScorecards.version, updatedAt: repositoryScorecards.updatedAt })
        .from(repositoryScorecards)
        .where(
          and(
            sql`LOWER(${repositoryScorecards.repoOwner}) = LOWER(${normalizedUser})`,
            sql`LOWER(${repositoryScorecards.repoName}) = ${normalizedRepo}`,
            eq(repositoryScorecards.ref, input.ref)
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
