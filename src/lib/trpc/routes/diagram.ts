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
      const { files, repo, diagramType, options } = input;
      
      const diagramCode = await generateRepoDiagramVercel({
        files,
        repoName: repo,
        diagramType,
        options,
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