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

// Simplified schema for chunk analysis - faster to generate
const partialSlopSchema = z.object({
  issues: z.array(z.object({
    file: z.string(),
    issue: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
  })),
  detectedPatterns: z.array(z.string()),
  aiGeneratedPercentage: z.number().min(0).max(100),
  chunkScore: z.number().min(0).max(100),
});

export type AISlopData = z.infer<typeof aiSlopSchema>;

export interface AISlopAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
  onProgress?: (message: string, progress: number) => void;
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
 * Retry wrapper with exponential backoff for rate limits
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorMessage = lastError.message || '';
      const is429 = errorMessage.includes('429') ||
                    errorMessage.includes('RESOURCE_EXHAUSTED') ||
                    errorMessage.includes('rate');

      if (is429 && attempt < maxRetries) {
        const retryDelay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Rate limited (attempt ${attempt + 1}/${maxRetries + 1}), waiting ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Format files for prompt context with safety truncation
 */
function formatFilesForPrompt(files: Array<{ path: string; content: string }>, maxCharsPerFile = 30000): string {
  return files.map(file => {
    let content = file.content;
    if (content.length > maxCharsPerFile) {
      content = content.slice(0, maxCharsPerFile) + '\n... (truncated)';
    }
    return `\n--- ${file.path} ---\n${content}`;
  }).join('\n');
}

/**
 * Analyze a chunk of files using fast model
 */
async function analyzeSlopChunk(
  files: Array<{ path: string; content: string }>,
  chunkIndex: number,
  totalChunks: number,
  repoName: string
) {
  const fileContents = formatFilesForPrompt(files);

  const prompt = `Analyze CHUNK ${chunkIndex + 1}/${totalChunks} of ${repoName} for code quality issues.

FILES:
${fileContents}

Find: repetitive code, unnecessary complexity, bad abstractions, loose types.
Return JSON with: issues (file, issue, severity), detectedPatterns, aiGeneratedPercentage, chunkScore.`;

  return retryWithBackoff(async () => {
    const { object, usage } = await generateObject({
      model: google('models/gemini-2.5-flash'), // Fast model for chunks
      schema: partialSlopSchema,
      messages: [{ role: 'user', content: prompt }],
    });
    return { result: object, usage };
  });
}

/**
 * Generate final report from chunk results using quality model
 */
async function generateFinalReport(
  chunkResults: Array<z.infer<typeof partialSlopSchema>>,
  repoName: string
) {
  const allIssues = chunkResults.flatMap(c => c.issues);
  const allPatterns = [...new Set(chunkResults.flatMap(c => c.detectedPatterns))];
  const avgScore = Math.round(chunkResults.reduce((sum, c) => sum + c.chunkScore, 0) / chunkResults.length);
  const avgAiPercent = Math.round(chunkResults.reduce((sum, c) => sum + c.aiGeneratedPercentage, 0) / chunkResults.length);

  const prompt = `Create a code quality report for ${repoName}.

DATA:
- Score: ${avgScore}/100
- AI Generated: ${avgAiPercent}%
- Patterns: ${allPatterns.join(', ')}
- Issues (${allIssues.length} total): ${JSON.stringify(allIssues.slice(0, 30))}

Generate comprehensive markdown report with metrics (Simplicity, DRY, Clarity, Maintainability, Value-to-Complexity).`;

  return retryWithBackoff(async () => {
    const { object, usage } = await generateObject({
      model: google('models/gemini-3-pro-preview'), // Quality model for final report
      schema: aiSlopSchema,
      messages: [{ role: 'user', content: prompt }],
    });
    return { result: object, usage };
  });
}

/**
 * Process chunks in parallel with concurrency limit
 */
async function processChunksParallel<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<unknown>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void
): Promise<unknown[]> {
  const results: unknown[] = new Array(items.length);
  let completed = 0;
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    const index = currentIndex++;
    if (index >= items.length) return;

    results[index] = await processor(items[index], index);
    completed++;
    onProgress?.(completed, items.length);

    await processNext();
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);
  return results;
}

/**
 * Detect AI-generated code and AI slop using Gemini AI
 */
export async function generateAISlopAnalysis({
  files,
  repoName,
  onProgress,
}: AISlopAnalysisParams): Promise<AISlopAnalysisResult> {
  const TOKENS_PER_CHUNK = 100000; // 100k tokens per chunk
  const MAX_CONCURRENCY = 3; // Process up to 3 chunks in parallel

  try {
    const totalEstimatedTokens = files.reduce((sum, f) =>
      sum + estimateTokens(f.content) + estimateTokens(f.path), 0);

    console.log(`🔍 AI Slop: ${files.length} files, ~${totalEstimatedTokens} tokens`);
    onProgress?.('Preparing analysis...', 15);

    // Build chunks
    const chunks: Array<Array<typeof files[0]>> = [];
    let currentChunk: Array<typeof files[0]> = [];
    let currentChunkTokens = 0;

    for (const file of files) {
      const fileTokens = estimateTokens(file.content) + estimateTokens(file.path);

      if (currentChunkTokens + fileTokens > TOKENS_PER_CHUNK && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [file];
        currentChunkTokens = fileTokens;
      } else {
        currentChunk.push(file);
        currentChunkTokens += fileTokens;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    console.log(`📦 Split into ${chunks.length} chunk(s)`);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    if (chunks.length === 1) {
      // Single chunk - direct analysis
      onProgress?.('Analyzing code quality...', 20);

      const { result, usage } = await analyzeSlopChunk(chunks[0], 0, 1, repoName);
      totalInputTokens += usage.inputTokens || 0;
      totalOutputTokens += usage.outputTokens || 0;

      onProgress?.('Generating report...', 70);

      const { result: finalResult, usage: finalUsage } = await generateFinalReport([result], repoName);
      totalInputTokens += finalUsage.inputTokens || 0;
      totalOutputTokens += finalUsage.outputTokens || 0;

      return {
        analysis: finalResult,
        usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, totalTokens: totalInputTokens + totalOutputTokens },
      };
    }

    // Multiple chunks - parallel processing
    onProgress?.(`Analyzing ${chunks.length} chunks in parallel...`, 20);

    const chunkResults = await processChunksParallel(
      chunks,
      async (chunk, index) => {
        console.log(`📝 Chunk ${index + 1}/${chunks.length} (${chunk.length} files)`);
        const { result, usage } = await analyzeSlopChunk(chunk, index, chunks.length, repoName);
        totalInputTokens += usage.inputTokens || 0;
        totalOutputTokens += usage.outputTokens || 0;
        return result;
      },
      MAX_CONCURRENCY,
      (completed, total) => {
        const progress = 20 + Math.round((completed / total) * 50);
        onProgress?.(`Analyzed ${completed}/${total} chunks...`, progress);
      }
    ) as Array<z.infer<typeof partialSlopSchema>>;

    onProgress?.('Generating final report...', 75);

    const { result, usage } = await generateFinalReport(chunkResults, repoName);
    totalInputTokens += usage.inputTokens || 0;
    totalOutputTokens += usage.outputTokens || 0;

    return {
      analysis: result,
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, totalTokens: totalInputTokens + totalOutputTokens },
    };
  } catch (error) {
    console.error('AI slop analysis error:', error);
    throw error;
  }
}
