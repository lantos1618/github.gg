import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { repositoryScorecards } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateScorecardAnalysis } from '@/lib/ai/scorecard';
import { TRPCError } from '@trpc/server';
import { scorecardSchema } from '@/lib/types/scorecard';
import { createGitHubServiceFromSession } from '@/lib/github';
import { executeAnalysisWithVersioning } from '@/lib/trpc/helpers/analysis-executor';

export const scorecardRouter = router({
  generateScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      files: z.array(z.object({
        path: z.string(),
        content: z.string(),
        size: z.number().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { insertedRecord } = await executeAnalysisWithVersioning({
          userId: ctx.user.id,
          feature: 'scorecard',
          repoOwner: input.user,
          repoName: input.repo,
          table: repositoryScorecards,
          generateFn: async () => {
            const result = await generateScorecardAnalysis({
              files: input.files,
              repoName: input.repo,
            });
            return {
              data: scorecardSchema.parse(result.scorecard),
              usage: result.usage,
            };
          },
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

        return {
          scorecard: {
            metrics: insertedRecord.metrics,
            markdown: insertedRecord.markdown,
            overallScore: insertedRecord.overallScore,
          },
          cached: false,
          stale: false,
          lastUpdated: insertedRecord.updatedAt || new Date(),
        };
      } catch (error) {
        console.error('🔥 Raw error in scorecard route:', error);
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate repository scorecard';
        throw new Error(userFriendlyMessage);
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
