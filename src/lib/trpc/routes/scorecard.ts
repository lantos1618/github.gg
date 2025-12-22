import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { repositoryScorecards, tokenUsage } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
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
          yield { type: 'error', message: 'No files selected for analysis. Please select at least one file.' };
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

        // Fetch file contents from GitHub
        const files = await fetchFilesByPaths(input.user, input.repo, input.filePaths, githubService, ref);

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
            eq(repositoryScorecards.repoOwner, input.user),
            eq(repositoryScorecards.repoName, input.repo),
            eq(repositoryScorecards.ref, ref)
          ))
          .orderBy(desc(repositoryScorecards.version))
          .limit(1);

        // Generate new scorecard
        const result = await generateScorecardAnalysis({
          files,
          repoName: input.repo,
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
              repoOwner: input.user,
              repoName: input.repo,
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
            eq(repositoryScorecards.ref, ref),
          ],
          buildInsertValues: (data, version) => ({
            userId: ctx.user.id,
            repoOwner: input.user,
            repoName: input.repo,
            ref: ref,
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
      
      // Normalize username to lowercase for consistency (GitHub usernames are case-insensitive)
      const normalizedUser = user.toLowerCase();
      
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
      
      // Use case-insensitive comparison for repoOwner to handle existing records with different casing
      const baseConditions = [
        sql`LOWER(${repositoryScorecards.repoOwner}) = LOWER(${normalizedUser})`,
        eq(repositoryScorecards.repoName, repo),
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
          eq(repositoryScorecards.repoName, repo)
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
      return await db
        .select({ version: repositoryScorecards.version, updatedAt: repositoryScorecards.updatedAt })
        .from(repositoryScorecards)
        .where(
          and(
            sql`LOWER(${repositoryScorecards.repoOwner}) = LOWER(${normalizedUser})`,
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
