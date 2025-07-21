import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { generateRepoDiagramVercel } from '@/lib/ai/diagram';
import { diagramInputSchema } from '@/lib/types/diagram';
import { parseGeminiError } from '@/lib/utils/errorHandling';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { db } from '@/db';
import { tokenUsage, repositoryDiagrams } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const diagramRouter = router({
  getDiagram: protectedProcedure
    .input(diagramInputSchema.pick({ user: true, repo: true, ref: true, diagramType: true }))
    .query(async ({ input, ctx }) => {
      const { user, repo, ref, diagramType } = input;
      
      // Check for cached diagram
      const cached = await db
        .select()
        .from(repositoryDiagrams)
        .where(
          and(
            eq(repositoryDiagrams.userId, ctx.user.id),
            eq(repositoryDiagrams.repoOwner, user),
            eq(repositoryDiagrams.repoName, repo),
            eq(repositoryDiagrams.ref, ref || 'main'),
            eq(repositoryDiagrams.diagramType, diagramType)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        const diagram = cached[0];
        const isStale = new Date().getTime() - diagram.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        
        return {
          diagramCode: diagram.diagramCode,
          format: diagram.format,
          diagramType,
          cached: true,
          stale: isStale,
          lastUpdated: diagram.updatedAt,
        };
      }

      return {
        diagramCode: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  // Public endpoint: anyone can fetch cached diagram for a repo/ref/type
  publicGetDiagram: publicProcedure
    .input(diagramInputSchema.pick({ user: true, repo: true, ref: true, diagramType: true }))
    .query(async ({ input }) => {
      const { user, repo, ref, diagramType } = input;
      // Find the most recent diagram for this repo/ref/type (any user)
      const cached = await db
        .select()
        .from(repositoryDiagrams)
        .where(
          and(
            eq(repositoryDiagrams.repoOwner, user),
            eq(repositoryDiagrams.repoName, repo),
            eq(repositoryDiagrams.ref, ref || 'main'),
            eq(repositoryDiagrams.diagramType, diagramType)
          )
        )
        .orderBy(desc(repositoryDiagrams.updatedAt))
        .limit(1);
      if (cached.length > 0) {
        const diagram = cached[0];
        const isStale = new Date().getTime() - diagram.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        return {
          diagramCode: diagram.diagramCode,
          format: diagram.format,
          diagramType,
          cached: true,
          stale: isStale,
          lastUpdated: diagram.updatedAt,
        };
      }
      return {
        diagramCode: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  generateDiagram: protectedProcedure
    .input(diagramInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { files, repo, diagramType, options, previousResult, lastError, isRetry } = input;
      
      // 1. Check user plan and get API key
      const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
      
      // Check for active subscription
      if (!subscription || subscription.status !== 'active') {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Active subscription required for AI features' 
        });
      }
      
      // 2. Get appropriate API key
      const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
      if (!keyInfo) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Please add your Gemini API key in settings to use this feature' 
        });
      }
      
      try {
        const result = await generateRepoDiagramVercel({
          files,
          repoName: repo,
          diagramType,
          options,
          previousResult,
          lastError,
          isRetry,
        });
        
        // 3. Save diagram to database
        await db
          .insert(repositoryDiagrams)
          .values({
            userId: ctx.user.id,
            repoOwner: input.user,
            repoName: input.repo,
            ref: input.ref || 'main',
            diagramType,
            diagramCode: result.diagramCode,
            format: 'mermaid',
            options: options || {},
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [repositoryDiagrams.userId, repositoryDiagrams.repoOwner, repositoryDiagrams.repoName, repositoryDiagrams.ref, repositoryDiagrams.diagramType],
            set: {
              diagramCode: result.diagramCode,
              options: options || {},
              updatedAt: new Date(),
            },
          });
        
        // 4. Log token usage with actual values from AI response
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'diagram',
          repoOwner: input.user,
          repoName: input.repo,
          model: 'gemini-2.5-flash', // Default model used
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
        });
        
        return {
          diagramCode: result.diagramCode,
          format: 'mermaid',
          diagramType,
          cached: false,
          stale: false,
          lastUpdated: new Date(),
        };
      } catch (error) {
        console.error('🔥 Raw error in diagram route:', error);
        console.error('🔥 Error type:', typeof error);
        console.error('🔥 Error message:', error instanceof Error ? error.message : 'No message');
        console.error('🔥 Error stack:', error instanceof Error ? error.stack : 'No stack');
        
        const userFriendlyMessage = parseGeminiError(error);
        throw new Error(userFriendlyMessage);
      }
    }),

  clearCache: protectedProcedure
    .input(diagramInputSchema.pick({ user: true, repo: true, ref: true, diagramType: true }))
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref, diagramType } = input;

      await db
        .delete(repositoryDiagrams)
        .where(
          and(
            eq(repositoryDiagrams.userId, ctx.user.id),
            eq(repositoryDiagrams.repoOwner, user),
            eq(repositoryDiagrams.repoName, repo),
            eq(repositoryDiagrams.ref, ref || 'main'),
            eq(repositoryDiagrams.diagramType, diagramType)
          )
        );

      return { success: true };
    }),
}); 