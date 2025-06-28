import { router, protectedProcedure } from '../trpc';
import { generateRepoDiagramVercel } from '@/lib/ai/diagram';
import { diagramInputSchema, diagramOutputSchema } from '@/lib/types/diagram';

export const diagramRouter = router({
  generateDiagram: protectedProcedure
    .input(diagramInputSchema)
    .mutation(async ({ input }) => {
      const { files, repo, diagramType, options, previousResult, lastError, isRetry } = input;
      
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
    }),
}); 