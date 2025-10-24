import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { aiSlopAnalyses } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateAISlopAnalysis, aiSlopSchema } from '@/lib/ai/ai-slop';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceFromSession } from '@/lib/github';
import { executeAnalysisWithVersioning } from '@/lib/trpc/helpers/analysis-executor';

/**
 * AI Slop Detection Router
 *
 * NOTE: This router has structural similarity with scorecard.ts. That duplication is intentional!
 *
 * Why we don't abstract this further:
 * - tRPC relies on static type inference - procedures must be explicitly defined
 * - Dynamic router factories break TypeScript's ability to infer types
 * - The "duplication" is mostly declarative configuration, not business logic
 * - The actual business logic IS abstracted in executeAnalysisWithVersioning
 *
 * Remember: Some duplication is healthy when it preserves type safety and clarity.
 * Don't fight the framework - work with tRPC's design, not against it.
 */
export const aiSlopRouter = router({
  detectAISlop: protectedProcedure
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
          feature: 'ai-slop',
          repoOwner: input.user,
          repoName: input.repo,
          table: aiSlopAnalyses,
          generateFn: async () => {
            const result = await generateAISlopAnalysis({
              files: input.files,
              repoName: input.repo,
            });
            return {
              data: aiSlopSchema.parse(result.analysis),
              usage: result.usage,
            };
          },
          versioningConditions: [
            eq(aiSlopAnalyses.userId, ctx.user.id),
            eq(aiSlopAnalyses.repoOwner, input.user),
            eq(aiSlopAnalyses.repoName, input.repo),
            eq(aiSlopAnalyses.ref, input.ref || 'main'),
          ],
          buildInsertValues: (data, version) => ({
            userId: ctx.user.id,
            repoOwner: input.user,
            repoName: input.repo,
            ref: input.ref || 'main',
            version,
            overallScore: data.overallScore,
            aiGeneratedPercentage: data.aiGeneratedPercentage,
            detectedPatterns: data.detectedPatterns,
            metrics: data.metrics,
            markdown: data.markdown,
            updatedAt: new Date(),
          }),
        });

        return {
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
        };
      } catch (error) {
        console.error('🔥 Raw error in AI slop route:', error);
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate AI slop analysis';
        throw new Error(userFriendlyMessage);
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

      const baseConditions = [
        eq(aiSlopAnalyses.repoOwner, user),
        eq(aiSlopAnalyses.repoName, repo),
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
      return await db
        .select({ version: aiSlopAnalyses.version, updatedAt: aiSlopAnalyses.updatedAt })
        .from(aiSlopAnalyses)
        .where(
          and(
            eq(aiSlopAnalyses.repoOwner, input.user),
            eq(aiSlopAnalyses.repoName, input.repo),
            eq(aiSlopAnalyses.ref, input.ref)
          )
        )
        .orderBy(desc(aiSlopAnalyses.version));
    }),
});
