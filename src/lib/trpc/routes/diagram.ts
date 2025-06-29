import { router, protectedProcedure } from '../trpc';
import { generateRepoDiagramVercel } from '@/lib/ai/diagram';
import { diagramInputSchema } from '@/lib/types/diagram';
import { parseGeminiError } from '@/lib/utils/errorHandling';

export const diagramRouter = router({
  generateDiagram: protectedProcedure
    .input(diagramInputSchema)
    .mutation(async ({ input }) => {
      const { files, repo, diagramType, options, previousResult, lastError, isRetry } = input;
      
      try {
        const diagramCode = await generateRepoDiagramVercel({
          files,
          repoName: repo,
          diagramType,
          options,
          previousResult,
          lastError,
          isRetry,
        });
        
        return {
          diagramCode,
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