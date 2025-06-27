import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { generateRepoDiagramVercel } from '@/lib/ai/diagram';

const diagramInputSchema = z.object({
  user: z.string(),
  repo: z.string(),
  ref: z.string().optional().default('main'),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    size: z.number().optional(),
  })),
  diagramType: z.enum(['flowchart', 'sequence', 'class', 'state', 'pie']).default('flowchart'),
  options: z.record(z.any()).optional(),
  // Retry context
  previousResult: z.string().optional(),
  lastError: z.string().optional(),
  isRetry: z.boolean().optional().default(false),
});

const retryDiagramInputSchema = z.object({
  user: z.string(),
  repo: z.string(),
  ref: z.string().optional().default('main'),
  diagramType: z.enum(['flowchart', 'sequence', 'class', 'state', 'pie']).default('flowchart'),
  options: z.record(z.any()).optional(),
  previousResult: z.string(),
  lastError: z.string(),
});

const diagramOutputSchema = z.object({
  diagramCode: z.string(),
  format: z.string().default('mermaid'),
  diagramType: z.enum(['flowchart', 'sequence', 'class', 'state', 'pie']),
  cached: z.boolean(),
  stale: z.boolean(),
  lastUpdated: z.date(),
});

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

  retryDiagram: protectedProcedure
    .input(retryDiagramInputSchema)
    .mutation(async ({ input }) => {
      const { repo, diagramType, options, previousResult, lastError } = input;
      
      // For retry, we don't need to send all files again
      // The AI can work with just the previous result and error context
      const diagramCode = await generateRepoDiagramVercel({
        files: [], // Empty files array for retry
        repoName: repo,
        diagramType,
        options,
        previousResult,
        lastError,
        isRetry: true,
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