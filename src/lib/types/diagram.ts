import { z } from 'zod';

// Shared diagram type definition
export const DIAGRAM_TYPE_VALUES = ['flowchart', 'sequence', 'class', 'state', 'pie', 'gantt'] as const;
export type DiagramType = typeof DIAGRAM_TYPE_VALUES[number];

// Zod schema for diagram types
export const diagramTypeSchema = z.enum(DIAGRAM_TYPE_VALUES);

// Diagram type options for UI
export const DIAGRAM_TYPES = [
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'sequence', label: 'Sequence Diagram' },
  { value: 'class', label: 'Class Diagram' },
  { value: 'state', label: 'State Diagram' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'gantt', label: 'Gantt Chart' },
] as const;

// Input schema for diagram generation
export const diagramInputSchema = z.object({
  user: z.string(),
  repo: z.string(),
  ref: z.string().optional().default('main'),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    size: z.number().optional(),
  })),
  diagramType: diagramTypeSchema.default('flowchart'),
  options: z.record(z.any()).optional(),
  // Retry context
  previousResult: z.string().optional(),
  lastError: z.string().optional(),
  isRetry: z.boolean().optional().default(false),
});

// Output schema for diagram generation
export const diagramOutputSchema = z.object({
  diagramCode: z.string(),
  format: z.string().default('mermaid'),
  diagramType: diagramTypeSchema,
  cached: z.boolean(),
  stale: z.boolean(),
  lastUpdated: z.date(),
}); 