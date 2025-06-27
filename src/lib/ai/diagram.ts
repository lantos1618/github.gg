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
}

// NOTE: The Google Gemini API key must be set in the environment as GOOGLE_GENERATIVE_AI_API_KEY
export async function generateRepoDiagramVercel({
  files,
  repoName,
  diagramType,
  options = {},
}: DiagramAnalysisParams): Promise<string> {
  const prompt = [
    'You are an expert software architect and diagram creator. Always respond ONLY with a valid JSON object matching this TypeScript type: { diagramCode: string }.',
    '',
    `Analyze the following repository files and generate a concise, accurate Mermaid ${diagramType} diagram.`,
    '',
    `REPOSITORY: ${repoName}`,
    `FILES: ${files.length} files`,
    `DIAGRAM TYPE: ${diagramType}`,
    `OPTIONS: ${JSON.stringify(options)}`,
    '',
    '---',
    'ANALYZE THESE FILES:',
    files
      .map(
        (file: any) =>
          [`--- ${file.path} ---`, file.content].join('\n')
      )
      .join('\n'),
  ].join('\n');

  const result = await generateObject({
    model: google('models/gemini-2.5-flash'),
    schema: diagramSchema,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  return result.object.diagramCode;
} 