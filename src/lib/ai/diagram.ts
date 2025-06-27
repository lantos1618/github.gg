import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';

export const diagramSchema = z.object({
  diagramCode: z.string(),
});

export interface DiagramAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
  diagramType: 'flowchart' | 'sequence' | 'class' | 'state' | 'pie';
  options?: Record<string, any>;
  // Retry context
  previousResult?: string;
  lastError?: string;
  isRetry?: boolean;
}

// NOTE: The Google Gemini API key must be set in the environment as GOOGLE_GENERATIVE_AI_API_KEY
export async function generateRepoDiagramVercel({
  files,
  repoName,
  diagramType,
  options = {},
  previousResult,
  lastError,
  isRetry = false,
}: DiagramAnalysisParams): Promise<string> {
  let prompt = `You are an expert software architect and diagram creator. 
Always respond ONLY with a valid JSON object matching this TypeScript type: { diagramCode: string }.
The diagram code should be a valid Mermaid diagram code.`;

  // Add retry context if this is a retry attempt
  if (isRetry && previousResult) {
    prompt += `\n\nRETRY CONTEXT:
This is a retry attempt. Here is the previous diagram result that had issues:
${previousResult}

${lastError ? `Previous error: ${lastError}` : 'Previous result had rendering issues'}

Please fix the issues in the previous diagram and provide an improved version. Focus on making the Mermaid syntax valid and improving the diagram structure.`;
  } else {
    prompt += `\nAnalyze the following repository files and generate a concise, accurate Mermaid ${diagramType} diagram.
- make sure to wrap titles and descriptions in quotes to escape special characters e.g. "
    - E("lib/github")
    - subgraph "Next.js Frontend"
    - A["User clicks button"]
    - B[("Database Query")]
    - C{{"API Response"}}



REPOSITORY: ${repoName}
FILES: ${files.length} files
DIAGRAM TYPE: ${diagramType}
OPTIONS: ${JSON.stringify(options)}

---
ANALYZE THESE FILES:
${files.map((file: any) => `--- ${file.path} ---\n${file.content}`).join('\n')}`;
  }

  const result = await generateObject({
    model: google('models/gemini-2.5-flash'),
    schema: diagramSchema,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  return result.object.diagramCode;
} 