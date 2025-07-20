import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { repositoryScorecards, tokenUsage } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateScorecardAnalysis } from '@/lib/ai/scorecard';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';

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
        // Generate scorecard using the AI service
        const result = await generateScorecardAnalysis({
          files,
          repoName: repo,
        });
        
        // The AI result is already in the structured format we want
        const scorecardData = result.scorecard;
        
        // Save to database with structured format
        await db
          .insert(repositoryScorecards)
          .values({
            userId: ctx.user.id,
            repoOwner: input.user,
            repoName: input.repo,
            ref: input.ref || 'main',
            overallScore: scorecardData.overallScore,
            metrics: scorecardData.metrics,
            markdown: scorecardData.markdown,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [repositoryScorecards.userId, repositoryScorecards.repoOwner, repositoryScorecards.repoName, repositoryScorecards.ref],
            set: {
              overallScore: scorecardData.overallScore,
              metrics: scorecardData.metrics,
              markdown: scorecardData.markdown,
              updatedAt: new Date(),
            },
          });
        
        // Log token usage with actual values from AI response
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'scorecard',
          repoOwner: input.user,
          repoName: input.repo,
          model: 'gemini-2.5-flash', // Default model used
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });
        
        return {
          scorecard: scorecardData,
          cached: false,
          stale: false,
          lastUpdated: new Date(),
        };
      } catch (error) {
        console.error('🔥 Raw error in scorecard route:', error);
        console.error('🔥 Error type:', typeof error);
        console.error('🔥 Error message:', error instanceof Error ? error.message : 'No message');
        console.error('🔥 Error stack:', error instanceof Error ? error.stack : 'No stack');
        
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate repository scorecard';
        throw new Error(userFriendlyMessage);
      }
    }),

  getScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
    }))
    .query(async ({ input, ctx }) => {
      const { user, repo, ref } = input;
      
      // Check for cached scorecard
      const cached = await db
        .select()
        .from(repositoryScorecards)
        .where(
          and(
            eq(repositoryScorecards.userId, ctx.user.id),
            eq(repositoryScorecards.repoOwner, user),
            eq(repositoryScorecards.repoName, repo),
            eq(repositoryScorecards.ref, ref)
          )
        )
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

  cacheScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      scorecard: z.object({
        metrics: z.array(z.object({
          metric: z.string(),
          score: z.number(),
          reason: z.string(),
        })),
        markdown: z.string(),
        overallScore: z.number(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref, scorecard } = input;

      // Upsert scorecard cache
      await db
        .insert(repositoryScorecards)
        .values({
          userId: ctx.user.id,
          repoOwner: user,
          repoName: repo,
          ref,
          overallScore: scorecard.overallScore,
          metrics: scorecard.metrics,
          markdown: scorecard.markdown,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [repositoryScorecards.userId, repositoryScorecards.repoOwner, repositoryScorecards.repoName, repositoryScorecards.ref],
          set: {
            overallScore: scorecard.overallScore,
            metrics: scorecard.metrics,
            markdown: scorecard.markdown,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),

  clearCache: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref } = input;

      await db
        .delete(repositoryScorecards)
        .where(
          and(
            eq(repositoryScorecards.userId, ctx.user.id),
            eq(repositoryScorecards.repoOwner, user),
            eq(repositoryScorecards.repoName, repo),
            eq(repositoryScorecards.ref, ref)
          )
        );

      return { success: true };
    }),
});
