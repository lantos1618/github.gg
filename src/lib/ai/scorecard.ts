import { generateObject } from 'ai';
import { GEMINI_PRO, GEMINI_FLASH } from './models';
import { scorecardSchema, type ScorecardData } from '@/lib/types/scorecard';
import { chunkFiles, needsChunking, getChunkingSummary, type Chunk } from './chunker';
import { retryWithBackoff } from './retry-utils';

export interface RepoMetadata {
  description?: string | null;
  stars?: number;
  forks?: number;
  language?: string | null;
  topics?: string[];
}

export interface ScorecardAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
  metadata?: RepoMetadata;
  onProgress?: (message: string, progress: number) => void;
  abortSignal?: AbortSignal;
}

export interface ScorecardAnalysisResult {
  scorecard: ScorecardData;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

function buildMetadataSection(metadata?: RepoMetadata): string {
  const lines: string[] = [];
  if (metadata?.description) lines.push(`Description: ${metadata.description}`);
  if (metadata?.language) lines.push(`Primary Language: ${metadata.language}`);
  if (metadata?.stars !== undefined) lines.push(`Stars: ${metadata.stars.toLocaleString()}`);
  if (metadata?.forks !== undefined) lines.push(`Forks: ${metadata.forks.toLocaleString()}`);
  if (metadata?.topics?.length) lines.push(`Topics: ${metadata.topics.join(', ')}`);
  return lines.length > 0 ? `\n${lines.join('\n')}\n` : '';
}

const SCORING_GUIDELINES = `SCORING GUIDELINES:
- 90-100: Exceptional - Production-ready, comprehensive testing, excellent patterns
- 80-89: Strong - Solid foundation, minor improvements possible
- 70-79: Good - Functional and maintainable, some gaps
- 60-69: Adequate - Works but has notable technical debt
- 50-59: Needs Work - Significant issues
- Below 50: Critical - Major issues requiring substantial refactoring`;

const METRICS_LIST = `METRICS TO EVALUATE (select 5-7 most relevant):
- Code Quality, Architecture, Documentation, Error Handling
- Security, Testing, Performance, Maintainability
- Type Safety, Dependencies, Developer Experience`;

const FORMAT_RULES = `CRITICAL FORMATTING RULES:
- The "markdown" field MUST use standard Markdown syntax (# for h1, ## for h2, **bold**, etc.)
- Do NOT use HTML tags. Use only pure Markdown.`;

/**
 * Render per-batch findings as collapsed <details> blocks. The markdown
 * renderer's sanitize schema allows <details>/<summary>, and rehype-raw lets
 * inner content stay parsed as markdown (blank lines around the HTML let the
 * GFM table + headings render properly).
 *
 * Why: synthesis collapses N detailed analyses into one summary, smoothing
 * away findings that lived in a single chunk (e.g. a memory-safety bug only
 * one batch caught). Preserving the raw per-batch results gives users a way
 * to dig in without nuking the executive summary at the top of the page.
 */
function renderPerBatchDetails(partials: ScorecardData[]): string {
  if (partials.length === 0) return '';

  const escapeCell = (s: string) =>
    s.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

  const blocks = partials.map((p, i) => {
    const tableRows = p.metrics
      .map(m => `| ${escapeCell(m.metric)} | ${m.score} | ${escapeCell(m.reason)} |`)
      .join('\n');
    const table = [
      '| Metric | Score | Notes |',
      '| --- | ---: | --- |',
      tableRows,
    ].join('\n');

    return [
      `<details>`,
      `<summary>Batch ${i + 1} — overall ${p.overallScore}/100</summary>`,
      ``,
      table,
      ``,
      `---`,
      ``,
      p.markdown,
      ``,
      `</details>`,
    ].join('\n');
  }).join('\n\n');

  return [
    `---`,
    ``,
    `## Per-batch findings`,
    ``,
    `_Synthesis collapses ${partials.length} detailed batch analyses into the executive summary above. Expand any batch to see what that pass actually found — including details that may have been smoothed away._`,
    ``,
    blocks,
  ].join('\n');
}

/**
 * Generate a single-chunk scorecard (no map-reduce needed).
 */
async function generateSingleChunkScorecard(
  files: Array<{ path: string; content: string }>,
  repoName: string,
  metadata?: RepoMetadata,
  abortSignal?: AbortSignal,
): Promise<ScorecardAnalysisResult> {
  const metadataSection = buildMetadataSection(metadata);

  const prompt = `You are a senior software architect conducting a thorough code review. Analyze this repository and produce a comprehensive scorecard report.

REPOSITORY: ${repoName}${metadataSection}
FILES ANALYZED: ${files.length}

${SCORING_GUIDELINES}

${METRICS_LIST}

MARKDOWN REPORT STRUCTURE:
1. **Executive Summary** - 2-3 sentence overview
2. **Overall Score** with justification
3. **Business Impact** - velocity, reliability, tech debt, scaling
4. **Technical Deep Dive** - patterns, specific files, architecture
5. **Strengths** - specific examples
6. **Areas for Improvement** - prioritized (high/medium/low)
7. **Actionable Recommendations** - concrete next steps
8. **Risk Assessment**

Be thorough and specific. Reference actual file names and code patterns.

${FORMAT_RULES}

OUTPUT FORMAT:
{
  "overallScore": number,
  "metrics": [{"metric": "Name", "score": number, "reason": "Justification with examples"}],
  "markdown": "Full markdown report"
}

---

${files.map(file => `--- ${file.path} ---\n${file.content}`).join('\n\n')}`;

  const { object, usage } = await retryWithBackoff(() =>
    generateObject({
      model: GEMINI_PRO,
      schema: scorecardSchema,
      messages: [{ role: 'user', content: prompt }],
      abortSignal,
    }),
  );

  return {
    scorecard: object,
    usage: {
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
    },
  };
}

/**
 * Analyze a single chunk for map-reduce. Returns a partial scorecard.
 */
async function analyzeChunk(
  chunk: Chunk,
  repoName: string,
  totalChunks: number,
  metadata?: RepoMetadata,
  abortSignal?: AbortSignal,
): Promise<{ scorecard: ScorecardData; usage: { inputTokens: number; outputTokens: number; totalTokens: number } }> {
  const metadataSection = buildMetadataSection(metadata);

  const prompt = `You are a senior software architect analyzing PART ${chunk.index + 1} of ${totalChunks} of a repository.
This is a partial analysis — another AI call will synthesize all parts into a final report.

REPOSITORY: ${repoName}${metadataSection}
CHUNK: ${chunk.index + 1} of ${totalChunks}
FILES IN THIS CHUNK: ${chunk.files.length}

${SCORING_GUIDELINES}

${METRICS_LIST}

Analyze these files thoroughly. Score each metric based ONLY on what you see in this chunk.
In the markdown, note which files/patterns you observed. Be specific.

${FORMAT_RULES}

OUTPUT FORMAT:
{
  "overallScore": number,
  "metrics": [{"metric": "Name", "score": number, "reason": "Justification from this chunk"}],
  "markdown": "Detailed analysis of this chunk's files"
}

---

${chunk.files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')}`;

  // Map step uses FLASH (5–10× faster than PRO) so big repos with many
  // chunks finish well inside the 5min serverless function timeout. PRO
  // is reserved for the synthesis step where reasoning quality matters most.
  const { object, usage } = await retryWithBackoff(() =>
    generateObject({
      model: GEMINI_FLASH,
      schema: scorecardSchema,
      messages: [{ role: 'user', content: prompt }],
      abortSignal,
    }),
  );

  return {
    scorecard: object,
    usage: {
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
    },
  };
}

/**
 * Synthesize multiple partial scorecards into one final result.
 */
async function synthesizeResults(
  partialResults: ScorecardData[],
  repoName: string,
  totalFiles: number,
  metadata?: RepoMetadata,
  abortSignal?: AbortSignal,
): Promise<{ scorecard: ScorecardData; usage: { inputTokens: number; outputTokens: number; totalTokens: number } }> {
  const metadataSection = buildMetadataSection(metadata);

  const partialsText = partialResults.map((r, i) => {
    const metricsText = r.metrics.map(m => `  - ${m.metric}: ${m.score}/100 — ${m.reason}`).join('\n');
    return `## Chunk ${i + 1} (Score: ${r.overallScore}/100)\n${metricsText}\n\n### Analysis:\n${r.markdown}`;
  }).join('\n\n---\n\n');

  const prompt = `You are a senior software architect producing the FINAL scorecard by synthesizing ${partialResults.length} partial analyses of the same repository.

REPOSITORY: ${repoName}${metadataSection}
TOTAL FILES ANALYZED: ${totalFiles}
PARTIAL ANALYSES: ${partialResults.length}

Each partial analysis scored a different subset of files. Your job:
1. Weigh scores across all partials — average where metrics overlap, note discrepancies
2. Combine findings into one coherent report
3. Resolve any conflicting observations
4. Produce the definitive overall score and metrics

${SCORING_GUIDELINES}

MARKDOWN REPORT STRUCTURE:
1. **Executive Summary** - synthesized overview
2. **Overall Score** with justification (weighted across all chunks)
3. **Business Impact**
4. **Technical Deep Dive** - combine findings from all chunks
5. **Strengths** - best examples from any chunk
6. **Areas for Improvement** - deduplicated, prioritized
7. **Actionable Recommendations**
8. **Risk Assessment**

${FORMAT_RULES}

OUTPUT FORMAT:
{
  "overallScore": number,
  "metrics": [{"metric": "Name", "score": number, "reason": "Synthesized justification"}],
  "markdown": "Full unified markdown report"
}

---

PARTIAL RESULTS:

${partialsText}`;

  const { object, usage } = await retryWithBackoff(() =>
    generateObject({
      model: GEMINI_PRO,
      schema: scorecardSchema,
      messages: [{ role: 'user', content: prompt }],
      abortSignal,
    }),
  );

  return {
    scorecard: object,
    usage: {
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
    },
  };
}

/**
 * Generate a scorecard analysis with automatic chunking for large repos.
 *
 * Small repos (fits in one chunk): single AI call
 * Large repos: map-reduce — parallel chunk analysis + synthesis
 */
export async function generateScorecardAnalysis({
  files,
  repoName,
  metadata,
  onProgress,
  abortSignal,
}: ScorecardAnalysisParams): Promise<ScorecardAnalysisResult> {
  try {
    // Always run through chunker — it filters binary, empty, oversized files
    // and sorts by importance, even if everything fits in one chunk.
    //
    // For scorecard we use larger chunks (400k tokens, ~half what Flash can
    // hold) and cap total files at 800. On a 1870-file repo this collapses
    // ~24 chunks down to ~4–6, which finishes inside the function timeout
    // even when one chunk gets unlucky with backoff. The chunker sorts by
    // importance, so capped repos still score on the files that matter.
    const chunks = chunkFiles(files, {
      maxTokensPerChunk: 400_000,
      maxTotalFiles: 800,
    });
    const summary = getChunkingSummary(chunks);

    if (chunks.length === 0) {
      throw new Error('No analyzable files found after filtering');
    }

    console.log(`📊 Scorecard: ${files.length} raw files → ${summary.totalFiles} filtered → ${summary.totalChunks} chunk(s)`);

    // Single chunk: direct analysis (no synthesis overhead)
    if (chunks.length === 1) {
      onProgress?.(`Analyzing ${summary.totalFiles} files...`, 15);
      return await generateSingleChunkScorecard(chunks[0].files, repoName, metadata, abortSignal);
    }

    // Multiple chunks: map-reduce
    onProgress?.(`Analyzing ${summary.totalFiles} files in ${summary.totalChunks} batches...`, 10);

    // Map: analyze chunks with bounded concurrency. An unbounded Promise.all
    // on N chunks fires N concurrent Gemini calls — on big repos that
    // saturates the provider, blows past the serverless function timeout,
    // and the client reconnects in a loop, re-firing all chunks.
    const MAX_CONCURRENCY = 3;
    const chunkResults: Array<Awaited<ReturnType<typeof analyzeChunk>> | null> =
      new Array(chunks.length).fill(null);
    let nextChunk = 0;
    let completedChunks = 0;
    let failedChunks = 0;
    async function worker(): Promise<void> {
      while (true) {
        const i = nextChunk++;
        if (i >= chunks.length) return;
        if (abortSignal?.aborted) return;
        onProgress?.(
          `Batch ${i + 1}/${chunks.length} (${chunks[i].files.length} files)...`,
          10 + (i / chunks.length) * 55,
        );
        try {
          chunkResults[i] = await analyzeChunk(chunks[i], repoName, chunks.length, metadata, abortSignal);
        } catch (err) {
          // A single chunk failing (rate limit exhaustion, schema validation
          // hiccup, etc.) shouldn't nuke the whole scorecard. Log it and let
          // synthesis run on the remaining N-1 chunks.
          failedChunks++;
          console.warn(`[scorecard] chunk ${i + 1}/${chunks.length} failed:`, err instanceof Error ? err.message : err);
        }
        completedChunks++;
        onProgress?.(
          `Analyzed ${completedChunks}/${chunks.length} batches...`,
          10 + (completedChunks / chunks.length) * 55,
        );
      }
    }
    await Promise.all(
      Array(Math.min(MAX_CONCURRENCY, chunks.length)).fill(null).map(() => worker()),
    );

    const successfulChunks = chunkResults.filter(
      (r): r is Awaited<ReturnType<typeof analyzeChunk>> => r !== null,
    );
    if (successfulChunks.length === 0) {
      throw new Error(`All ${chunks.length} analysis batches failed`);
    }
    if (failedChunks > 0) {
      console.warn(`[scorecard] proceeding with ${successfulChunks.length}/${chunks.length} successful chunks (${failedChunks} failed)`);
    }

    onProgress?.('Synthesizing results across all batches...', 70);

    // Reduce: synthesize partial results into final scorecard
    const synthesized = await synthesizeResults(
      successfulChunks.map(r => r.scorecard),
      repoName,
      summary.totalFiles,
      metadata,
      abortSignal,
    );

    // Sum token usage across all calls
    const totalUsage = {
      inputTokens: successfulChunks.reduce((sum, r) => sum + r.usage.inputTokens, 0) + synthesized.usage.inputTokens,
      outputTokens: successfulChunks.reduce((sum, r) => sum + r.usage.outputTokens, 0) + synthesized.usage.outputTokens,
      totalTokens: successfulChunks.reduce((sum, r) => sum + r.usage.totalTokens, 0) + synthesized.usage.totalTokens,
    };

    // Synthesis collapses N detailed analyses into one executive summary.
    // Preserve the per-batch findings as collapsed <details> sections so the
    // user can dig in (critical bugs sometimes live in a single chunk and
    // get smoothed away by the synthesizer).
    const perBatchSection = renderPerBatchDetails(successfulChunks.map(r => r.scorecard));
    const enrichedMarkdown = `${synthesized.scorecard.markdown}\n\n${perBatchSection}`;

    return {
      scorecard: { ...synthesized.scorecard, markdown: enrichedMarkdown },
      usage: totalUsage,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}
