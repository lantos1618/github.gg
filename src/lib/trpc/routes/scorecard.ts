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
import { fetchFilesByPaths } from '@/lib/github/file-fetcher';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';

export const scorecardRouter = router({
  generateScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional(),
      filePaths: z.array(z.string()).optional().default([]),
    }))
    .subscription(async function* ({ input, ctx }) {
      const repoOwnerNormalized = input.user.toLowerCase();
      const repoNameNormalized = input.repo.toLowerCase();

      try {
        yield { type: 'progress', progress: 0, message: 'Starting scorecard analysis...' };

        yield { type: 'progress', progress: 3, message: 'Authenticating with GitHub...' };

        const githubService = await createGitHubServiceForRepo(input.user, input.repo, ctx.session);

        yield { type: 'progress', progress: 4, message: 'Fetching repository info...' };
        const repoInfo = await githubService.getRepositoryInfo(input.user, input.repo);
        const ref = (!input.ref || input.ref === 'main') ? (repoInfo.defaultBranch || 'main') : input.ref;
        const isPrivate = repoInfo.private === true;

        yield { type: 'progress', progress: 5, message: 'Fetching repository files...' };

        // Fetch files from tarball (fast, single request) instead of individual API calls
        const repoFiles = await githubService.getRepositoryFiles(input.user, input.repo, ref, 500);
        const selectedPaths = input.filePaths && input.filePaths.length > 0
          ? new Set(input.filePaths)
          : null; // null = use all files

        const files = repoFiles.files
          .filter(f => f.type === 'file' && f.content)
          .filter(f => !selectedPaths || selectedPaths.has(f.path))
          .filter(f => f.size < 100000) // Skip huge files
          .slice(0, 200) // Cap at 200 files
          .map(f => ({ path: f.path, content: f.content!, size: f.size }));

        if (!files || files.length === 0) {
          yield { type: 'error', message: 'Failed to fetch any files from GitHub. Please check the repository and file paths.' };
          return;
        }

        yield { type: 'progress', progress: 15, message: `Analyzing ${files.length} files with AI (this may take 30-60 seconds)...` };

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

        // Generate new scorecard
        const result = await generateScorecardAnalysis({
          files,
          repoName: input.repo,
          metadata: {
            description: repoInfo.description,
            stars: repoInfo.stargazersCount,
            forks: repoInfo.forksCount,
            language: repoInfo.language,
            topics: repoInfo.topics,
          },
        });

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
            const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
            const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');

            await db.insert(tokenUsage).values({
              userId: ctx.user.id,
              feature: 'scorecard',
              repoOwner: repoOwnerNormalized,
              repoName: repoNameNormalized,
              model: 'gemini-3-pro-preview',
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

  // Unified public endpoint: fetch latest or specific version of a scorecard for a repo/ref
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

      // Resolve actual default branch if no ref provided
      let ref = input.ref;
      if (!ref) {
        try {
          const githubService = await createGitHubServiceForRepo(user, repo, ctx.session);
          const repoInfo = await githubService.getRepositoryInfo(user, repo);

          if (repoInfo.private === true && !ctx.session?.user) {
            return { scorecard: null, cached: false, stale: false, lastUpdated: null, error: 'This repository is private' };
          }

          ref = repoInfo.defaultBranch || 'main';
        } catch {
          return { scorecard: null, cached: false, stale: false, lastUpdated: null, error: 'Unable to access repository' };
        }
      } else {
        // Still check access for provided ref
        try {
          const githubService = await createGitHubServiceForRepo(user, repo, ctx.session);
          const repoInfo = await githubService.getRepositoryInfo(user, repo);
          if (repoInfo.private === true && !ctx.session?.user) {
            return { scorecard: null, cached: false, stale: false, lastUpdated: null, error: 'This repository is private' };
          }
        } catch {
          return { scorecard: null, cached: false, stale: false, lastUpdated: null, error: 'Unable to access repository' };
        }
      }

      const normalizedRepo = repo.toLowerCase();
      const baseConditions = [
        sql`LOWER(${repositoryScorecards.repoOwner}) = LOWER(${normalizedUser})`,
        sql`LOWER(${repositoryScorecards.repoName}) = ${normalizedRepo}`,
        eq(repositoryScorecards.ref, ref),
      ];
      if (version !== undefined) {
        baseConditions.push(eq(repositoryScorecards.version, version));
      }
      
      console.log(`🔍 Querying scorecards for ${normalizedUser}/${repo}@${ref}${version !== undefined ? ` version ${version}` : ' (latest)'}`);
      
      const cached = await db
        .select()
        .from(repositoryScorecards)
        .where(and(...baseConditions))
        .orderBy(desc(repositoryScorecards.updatedAt))
        .limit(1);
      
      if (cached.length > 0) {
        const scorecard = cached[0];
        console.log(`✅ Found scorecard for ${normalizedUser}/${repo}@${ref}, version ${scorecard.version}, userId: ${scorecard.userId}, updatedAt: ${scorecard.updatedAt}`);
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
      
      // Log when no scorecard is found for debugging
      console.warn(`⚠️ No scorecard found for ${normalizedUser}/${repo}@${ref}. Checking if any scorecards exist for this repo...`);
      const anyScorecard = await db
        .select()
        .from(repositoryScorecards)
        .where(and(
          sql`LOWER(${repositoryScorecards.repoOwner}) = LOWER(${normalizedUser})`,
          sql`LOWER(${repositoryScorecards.repoName}) = ${normalizedRepo}`
        ))
        .limit(5);
      if (anyScorecard.length > 0) {
        console.warn(`⚠️ Found ${anyScorecard.length} scorecard(s) for ${normalizedUser}/${repo} but with different refs/versions:`, 
          anyScorecard.map(s => ({ ref: s.ref, version: s.version, userId: s.userId, updatedAt: s.updatedAt })));
      } else {
        console.warn(`⚠️ No scorecards found at all for ${normalizedUser}/${repo}`);
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
