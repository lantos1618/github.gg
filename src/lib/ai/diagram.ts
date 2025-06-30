import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { DiagramType } from '@/lib/types/diagram';

export const diagramSchema = z.object({
  diagramCode: z.string(),
});

export interface DiagramAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
  diagramType: DiagramType;
  options?: Record<string, unknown>;
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

---
HERE IS AN EXAMPLE OF A GOOD, VALID MERMAID FLOWCHART:

flowchart TD
    A["User visits /"] --> B{{"Next.js Server"}};
    B --> C["src/app/page.tsx"];
    C --> D["components/ScrollingRepos"];
    D --> E("trpc.github.getReposForScrolling");
    E --> F[("Database: cached_repos")];

HERE IS AN EXAMPLE OF A GOOD, VALID GANTT DIAGRAM:

USE TODO.MD OR README.MD AS A REFERENCE FOR THE TASKS TO INCLUDE IN THE GANTT DIAGRAM. 
YOU CAN ALSO MAKE (suggested) TASKS FOR THE GANTT DIAGRAM.

gantt
    title A Gantt Diagram
    dateFormat  X
    axisFormat %m/%d/%Y
    section Section
    Task1 :a1, 2025-01-01, 2025-01-05
    Task2 :a2, 2025-01-06, 2025-01-10

The example above uses quotes for node text to handle special characters like '/'. Apply this pattern.

REPOSITORY: ${repoName}
FILES: ${files.length} files
DIAGRAM TYPE: ${diagramType}
OPTIONS: ${JSON.stringify(options)}

---
ANALYZE THESE FILES:
${files.map((file: { path: string; content: string }) => `--- ${file.path} ---\n${file.content}`).join('\n')}`;
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