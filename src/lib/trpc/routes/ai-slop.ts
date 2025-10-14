import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { aiSlopAnalyses, tokenUsage } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { generateAISlopAnalysis, aiSlopSchema } from '@/lib/ai/ai-slop';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';
import { isPgErrorWithCode } from '@/lib/db/utils';
import { createGitHubServiceFromSession } from '@/lib/github';

export const aiSlopRouter = router({
  generateAISlop: protectedProcedure
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
      const { repo, files } = input;

      // Check for active subscription
      const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
      if (!subscription || subscription.status !== 'active') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Active subscription required for AI features'
        });
      }

      // Get appropriate API key
      const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
      if (!keyInfo) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Please add your Gemini API key in settings to use this feature'
        });
      }

      try {
        // Generate AI slop analysis using the AI service
        const result = await generateAISlopAnalysis({
          files,
          repoName: repo,
        });

        // Parse and validate the AI result
        const analysisData = aiSlopSchema.parse(result.analysis);

        // Per-group versioning: get max version for this group, then insert with version = max + 1, retry on conflict
        let insertedAnalysis = null;
        let attempt = 0;
        while (!insertedAnalysis && attempt < 5) {
          attempt++;
          // 1. Get current max version for this group
          const maxVersionResult = await db
            .select({ max: sql`MAX(version)` })
            .from(aiSlopAnalyses)
            .where(
              and(
                eq(aiSlopAnalyses.userId, ctx.user.id),
                eq(aiSlopAnalyses.repoOwner, input.user),
                eq(aiSlopAnalyses.repoName, input.repo),
                eq(aiSlopAnalyses.ref, input.ref || 'main')
              )
            );
          const rawMax = maxVersionResult[0]?.max;
          const maxVersion = typeof rawMax === 'number' ? rawMax : Number(rawMax) || 0;
          const nextVersion = maxVersion + 1;

          try {
            // 2. Try insert
            const [result] = await db
              .insert(aiSlopAnalyses)
              .values({
                userId: ctx.user.id,
                repoOwner: input.user,
                repoName: input.repo,
                ref: input.ref || 'main',
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
            if (result) {
              insertedAnalysis = result;
            }
          } catch (e: unknown) {
            // If unique constraint violation, retry
            if (isPgErrorWithCode(e) && e.code === '23505') {
              // Unique constraint violation, retry
              continue;
            }
            throw e;
          }
        }
        if (!insertedAnalysis) {
          throw new Error('Failed to insert AI slop analysis after multiple attempts');
        }

        // Log token usage with actual values from AI response
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'ai-slop',
          repoOwner: input.user,
          repoName: input.repo,
          model: 'gemini-2.5-pro',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });

        // Return the inserted analysis
        return {
          analysis: {
            metrics: insertedAnalysis.metrics,
            markdown: insertedAnalysis.markdown,
            overallScore: insertedAnalysis.overallScore,
            aiGeneratedPercentage: insertedAnalysis.aiGeneratedPercentage,
            detectedPatterns: insertedAnalysis.detectedPatterns,
          },
          cached: false,
          stale: false,
          lastUpdated: insertedAnalysis.updatedAt || new Date(),
        };
      } catch (error) {
        console.error('🔥 Raw error in AI slop route:', error);
        console.error('🔥 Error type:', typeof error);
        console.error('🔥 Error message:', error instanceof Error ? error.message : 'No message');
        console.error('🔥 Error stack:', error instanceof Error ? error.stack : 'No stack');

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
