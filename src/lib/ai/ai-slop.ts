import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Schema for AI slop detection
export const aiSlopSchema = z.object({
  metrics: z.array(z.object({
    metric: z.string(),
    score: z.number().min(0).max(100),
    reason: z.string(),
  })),
  markdown: z.string(),
  overallScore: z.number().min(0).max(100),
  aiGeneratedPercentage: z.number().min(0).max(100),
  detectedPatterns: z.array(z.string()),
});

// Partial schema for chunk analysis
const partialSlopSchema = z.object({
  metrics: z.array(z.object({
    metric: z.string(),
    score: z.number().min(0).max(100),
    reason: z.string(),
  })),
  detectedPatterns: z.array(z.string()),
  issues: z.array(z.object({
    file: z.string(),
    issue: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    snippet: z.string(),
    fix: z.string(),
    whyFixMatters: z.string(),
  })),
  aiGeneratedPercentage: z.number().min(0).max(100),
  chunkScore: z.number().min(0).max(100),
});

export type AISlopData = z.infer<typeof aiSlopSchema>;

export interface AISlopAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
  useChunking?: boolean;
  tokensPerChunk?: number;
}

export interface AISlopAnalysisResult {
  analysis: AISlopData;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Estimate token count from text
 * Approximation: 1 token ≈ 4 characters
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    ),
  ]);
}

/**
 * Format files for prompt context with safety truncation
 */
function formatFilesForPrompt(files: Array<{ path: string; content: string }>): string {
  return files.map(file => {
    // Truncate massive individual files even in chunks to prevent context exhaustion from single files
    // 50,000 chars ≈ 12.5k tokens
    const MAX_CHARS = 50000;
    let content = file.content;
    if (content.length > MAX_CHARS) {
      content = content.slice(0, MAX_CHARS) + '\n... (file truncated for analysis)';
    }
    return `\n--- ${file.path} ---\n${content}`;
  }).join('\n');
}

/**
 * Analyze a chunk of files for code slop
 */
async function analyzeSlopChunk(
  files: Array<{ path: string; content: string }>,
  chunkIndex: number,
  totalChunks: number,
  repoName: string
) {
  const fileContents = formatFilesForPrompt(files);

  const prompt = `You are an expert code quality analyst specializing in detecting "code slop" - low-quality code patterns.
Analyzing CHUNK ${chunkIndex + 1} of ${totalChunks} for repository: ${repoName}

TASK:
Analyze these specific files for CODE QUALITY ISSUES.

🚩 PRIMARY SLOP PATTERNS TO DETECT:
1. REPETITIVE CODE (Copy-pasted logic)
2. PERFORMATIVE CODE (Over-engineered, adds no value)
3. UNNECESSARY COMPLEXITY (Deep nesting, huge functions)
4. VALUELESS BOILERPLATE (Generic handlers, wrapper functions)
5. BAD ABSTRACTIONS (Leaky, premature, or inconsistent)
6. USELESS TESTS (Mock-only verification)
7. LOOSE TYPESCRIPT TYPES (any/unknown abuse)
8. INCONSISTENT FILE STRUCTURE

CODEBASE FILES IN THIS CHUNK:
${fileContents}

REQUIREMENTS:
- Identify specific issues in these files with code snippets.
- Propose concrete fixes.
- Rate the quality of this chunk.
- Estimate AI-generated percentage for this chunk.

Your response must be a valid JSON object following the schema provided.`;

  // 90 second timeout for chunk analysis
  const { object, usage } = await withTimeout(
    generateObject({
      model: google('models/gemini-3-pro-preview'),
      schema: partialSlopSchema,
      messages: [{ role: 'user', content: prompt }],
    }),
    90000,
    `Chunk ${chunkIndex + 1}/${totalChunks} analysis`
  );

  return { result: object, usage };
}

/**
 * Stitch together chunk results into a final report
 */
async function stitchSlopChunks(
  chunkResults: Array<z.infer<typeof partialSlopSchema>>,
  repoName: string
) {
  if (chunkResults.length === 0) {
    throw new Error('No analysis results to stitch');
  }

  const allIssues = chunkResults.flatMap(c => c.issues);
  const allPatterns = Array.from(new Set(chunkResults.flatMap(c => c.detectedPatterns)));
  
  // Calculate weighted averages for scores
  const totalScore = chunkResults.reduce((sum, c) => sum + c.chunkScore, 0);
  const avgScore = Math.round(totalScore / chunkResults.length);
  
  const totalAiPercent = chunkResults.reduce((sum, c) => sum + c.aiGeneratedPercentage, 0);
  const avgAiPercent = Math.round(totalAiPercent / chunkResults.length);

  const prompt = `You are a Lead Code Quality Architect. Create a FINAL COMPREHENSIVE REPORT by aggregating analysis from multiple file chunks.

REPOSITORY: ${repoName}

AGGREGATED DATA FROM CHUNKS:
- Average Quality Score: ${avgScore}/100
- Average AI-Generated %: ${avgAiPercent}%
- Detected Patterns: ${JSON.stringify(allPatterns)}

TOP 50 IDENTIFIED ISSUES ACROSS CODEBASE:
${JSON.stringify(allIssues.slice(0, 50), null, 2)}

TASK:
Generate a cohesive, final markdown report that summarizes the findings.
- Don't just list issues; synthesize them into "Key Findings".
- Use the specific code snippets provided in the issues to show "Before" vs "After" examples.
- Provide a final "Overall Quality Score" (you can adjust the average based on the severity of issues found).
- Create a final list of Metrics.

METRICS TO EVALUATE (0-100 scale):
- Simplicity
- DRY Principle
- Clarity
- Maintainability
- Value-to-Complexity Ratio

Your response must be a valid JSON object following the schema provided.`;

  // 120 second timeout for stitching results
  const { object, usage } = await withTimeout(
    generateObject({
      model: google('models/gemini-3-pro-preview'),
      schema: aiSlopSchema,
      messages: [{ role: 'user', content: prompt }],
    }),
    120000,
    'Stitching chunk results'
  );

  return { result: object, usage };
}

/**
 * Detect AI-generated code and AI slop using Gemini AI
 */
export async function generateAISlopAnalysis({
  files,
  repoName,
  useChunking = true,
  tokensPerChunk = 150000, // 150k tokens per chunk for reliable processing
}: AISlopAnalysisParams): Promise<AISlopAnalysisResult> {
  try {
    // Estimate total tokens
    const totalEstimatedTokens = files.reduce((sum, f) => {
      return sum + estimateTokens(f.content) + estimateTokens(f.path);
    }, 0);

    console.log(`🔍 Analyzing ${files.length} files. Estimated tokens: ${totalEstimatedTokens}`);

    // Decide whether to use chunking
    const shouldChunk = useChunking && totalEstimatedTokens > tokensPerChunk;

    if (shouldChunk) {
      console.log(`🔄 Using token-based chunking: >${tokensPerChunk} tokens`);
      
      const chunks: Array<Array<typeof files[0]>> = [];
      let currentChunk: Array<typeof files[0]> = [];
      let currentChunkTokens = 0;

      for (const file of files) {
        const fileTokens = estimateTokens(file.content) + estimateTokens(file.path);

        // If adding this file would exceed the limit, start a new chunk
        if (currentChunkTokens + fileTokens > tokensPerChunk && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [file];
          currentChunkTokens = fileTokens;
        } else {
          currentChunk.push(file);
          currentChunkTokens += fileTokens;
        }
      }
      // Don't forget the last chunk
      if (currentChunk.length > 0) chunks.push(currentChunk);

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const chunkResults: Array<z.infer<typeof partialSlopSchema>> = [];

      // Analyze chunks
      for (let i = 0; i < chunks.length; i++) {
        console.log(`📝 Analyzing chunk ${i + 1}/${chunks.length} (${chunks[i].length} files)...`);
        const { result, usage } = await analyzeSlopChunk(chunks[i], i, chunks.length, repoName);
        chunkResults.push(result);
        totalInputTokens += usage.inputTokens || 0;
        totalOutputTokens += usage.outputTokens || 0;
      }

      // Stitch results
      console.log(`🧵 Stitching ${chunks.length} chunks...`);
      const { result, usage } = await stitchSlopChunks(chunkResults, repoName);
      
      totalInputTokens += usage.inputTokens || 0;
      totalOutputTokens += usage.outputTokens || 0;

      return {
        analysis: result,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
        },
      };
    }

    // Fallback to single-pass analysis for smaller codebases
    console.log(`⚡ Using single-pass analysis (small codebase)`);
    
    const fileContents = formatFilesForPrompt(files);
    
    const prompt = `You are an expert code quality analyst specializing in detecting "code slop" - low-quality code patterns.

REPOSITORY: ${repoName}
FILES: ${files.length} files

TASK:
Analyze this codebase for CODE QUALITY ISSUES, focusing on patterns that reduce maintainability and add no real value.

🚩 PRIMARY SLOP PATTERNS TO DETECT:
1. REPETITIVE CODE
2. PERFORMATIVE CODE
3. UNNECESSARY COMPLEXITY
4. VALUELESS BOILERPLATE
5. BAD ABSTRACTIONS
6. USELESS TESTS
7. LOOSE TYPESCRIPT TYPES
8. INCONSISTENT FILE STRUCTURE

IMPORTANT: In your "How to Fix" section, use REAL CODE from the files provided.

Your response must be a valid JSON object with this exact structure:
{
  "metrics": [
    { "metric": "Simplicity", "score": 0-100, "reason": "..." }
  ],
  "markdown": "# 🚩 Code Quality Report...",
  "overallScore": 0-100,
  "aiGeneratedPercentage": 0-100,
  "detectedPatterns": ["..."]
}

ANALYZE THESE FILES:
${fileContents}`;

    // 120 second timeout for single-pass analysis
    const { object, usage } = await withTimeout(
      generateObject({
        model: google('models/gemini-3-pro-preview'),
        schema: aiSlopSchema,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
      120000,
      'Single-pass AI slop analysis'
    );

    return {
      analysis: object,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
      },
    };
  } catch (error) {
    console.error('Gemini API error in AI slop detection:', error);
    throw error;
  }
}
