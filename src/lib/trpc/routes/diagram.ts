import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { generateRepoDiagramVercel } from '@/lib/ai/diagram';
import { diagramInputSchema } from '@/lib/types/diagram';
import { parseGeminiError } from '@/lib/utils/errorHandling';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { db } from '@/db';
import { tokenUsage } from '@/db/schema';
import { TRPCError } from '@trpc/server';

export const diagramRouter = router({
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
        
        // 3. Log token usage with actual values from AI response
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
}); 