/**
 * Token-aware file chunker for AI analysis.
 *
 * Splits a set of files into chunks that fit within a token budget,
 * then provides a synthesis step to combine partial results.
 *
 * Used by: scorecard, ai-slop, wiki, diagrams, profile analysis.
 *
 * Architecture:
 *   files → estimateTokens → sortByImportance → packIntoChunks
 *   chunks → parallel AI calls → partial results
 *   partial results → synthesis AI call → final result
 */

export interface SourceFile {
  path: string;
  content: string;
  size?: number;
}

export interface Chunk {
  index: number;
  files: SourceFile[];
  tokenEstimate: number;
}

export interface ChunkerOptions {
  /** Max tokens per chunk (leave room for prompt + response). Default: 200_000 */
  maxTokensPerChunk?: number;
  /** Max total files to process (after importance sorting). Default: unlimited */
  maxTotalFiles?: number;
  /** Max file size in bytes to include. Default: 100_000 (100KB) */
  maxFileSize?: number;
  /** File extensions to prioritize (e.g. ['.ts', '.tsx', '.py']). Default: all */
  priorityExtensions?: string[];
}

// ~4 chars per token is a reasonable estimate for code
const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count for a string.
 * Uses char-based heuristic (~4 chars/token for code).
 * Accurate enough for chunking — we're not billing on this.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate tokens for a file including its path header.
 */
function estimateFileTokens(file: SourceFile): number {
  // Account for the "--- path ---\n" header per file
  return estimateTokens(`--- ${file.path} ---\n${file.content}`);
}

/**
 * Score file importance for sorting.
 * Higher = more important = analyzed first.
 */
function scoreImportance(file: SourceFile): number {
  const path = file.path.toLowerCase();
  let score = 0;

  // Core source files score highest
  const coreExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.swift', '.kt'];
  const ext = '.' + path.split('.').pop();
  if (coreExts.includes(ext)) score += 100;

  // Entry points and configs
  if (path.includes('index.') || path.includes('main.') || path.includes('app.')) score += 50;
  if (path.endsWith('package.json') || path.endsWith('cargo.toml') || path.endsWith('go.mod')) score += 40;
  if (path.endsWith('readme.md') || path.endsWith('readme')) score += 30;

  // Penalize generated/vendored/test files
  if (path.includes('node_modules/') || path.includes('vendor/') || path.includes('.git/')) score -= 1000;
  if (path.includes('dist/') || path.includes('build/') || path.includes('.next/')) score -= 500;
  if (path.includes('__pycache__/') || path.includes('.cache/')) score -= 500;
  if (path.includes('.min.') || path.includes('.map')) score -= 200;
  if (path.includes('lock') && (path.endsWith('.json') || path.endsWith('.yaml') || path.endsWith('.lock'))) score -= 300;

  // Test files are useful but less critical than source
  if (path.includes('test') || path.includes('spec') || path.includes('__test')) score -= 20;

  // Deeper nesting = less likely to be core
  const depth = path.split('/').length;
  score -= depth * 2;

  // Larger files tend to be more substantial
  const size = file.size || file.content.length;
  if (size > 1000) score += 10;
  if (size > 5000) score += 10;

  return score;
}

/**
 * Chunk files into token-budget-aware batches.
 *
 * 1. Filter out files that are too large or have no content
 * 2. Sort by importance
 * 3. Pack into chunks respecting token budget
 *
 * Returns chunks ready for parallel AI processing.
 */
export function chunkFiles(files: SourceFile[], options: ChunkerOptions = {}): Chunk[] {
  const {
    maxTokensPerChunk = 200_000,
    maxTotalFiles,
    maxFileSize = 100_000,
  } = options;

  // Filter
  let processable = files.filter(f => {
    if (!f.content || f.content.trim().length === 0) return false;
    const size = f.size || f.content.length;
    if (size > maxFileSize) return false;
    // Skip binary-looking content
    if (f.content.includes('\0')) return false;
    return true;
  });

  // Sort by importance (highest first)
  processable.sort((a, b) => scoreImportance(b) - scoreImportance(a));

  // Cap total files if specified
  if (maxTotalFiles && processable.length > maxTotalFiles) {
    processable = processable.slice(0, maxTotalFiles);
  }

  // Pack into chunks by token budget
  const chunks: Chunk[] = [];
  let currentChunk: SourceFile[] = [];
  let currentTokens = 0;

  for (const file of processable) {
    const fileTokens = estimateFileTokens(file);

    // If single file exceeds budget, truncate its content to fit
    if (fileTokens > maxTokensPerChunk) {
      const maxChars = maxTokensPerChunk * CHARS_PER_TOKEN;
      const truncated = {
        ...file,
        content: file.content.slice(0, maxChars) + '\n\n... [truncated]',
      };
      // Flush current chunk if non-empty
      if (currentChunk.length > 0) {
        chunks.push({ index: chunks.length, files: currentChunk, tokenEstimate: currentTokens });
        currentChunk = [];
        currentTokens = 0;
      }
      chunks.push({ index: chunks.length, files: [truncated], tokenEstimate: maxTokensPerChunk });
      continue;
    }

    // If adding this file would exceed budget, flush current chunk
    if (currentTokens + fileTokens > maxTokensPerChunk && currentChunk.length > 0) {
      chunks.push({ index: chunks.length, files: currentChunk, tokenEstimate: currentTokens });
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(file);
    currentTokens += fileTokens;
  }

  // Flush remaining
  if (currentChunk.length > 0) {
    chunks.push({ index: chunks.length, files: currentChunk, tokenEstimate: currentTokens });
  }

  return chunks;
}

/**
 * Check if files need chunking (i.e., won't fit in a single AI call).
 */
export function needsChunking(files: SourceFile[], maxTokensPerChunk = 200_000): boolean {
  let totalTokens = 0;
  for (const file of files) {
    totalTokens += estimateFileTokens(file);
    if (totalTokens > maxTokensPerChunk) return true;
  }
  return false;
}

/**
 * Get a summary of the chunking plan (useful for progress reporting).
 */
export function getChunkingSummary(chunks: Chunk[]): {
  totalChunks: number;
  totalFiles: number;
  totalTokens: number;
  filesPerChunk: number[];
} {
  return {
    totalChunks: chunks.length,
    totalFiles: chunks.reduce((sum, c) => sum + c.files.length, 0),
    totalTokens: chunks.reduce((sum, c) => sum + c.tokenEstimate, 0),
    filesPerChunk: chunks.map(c => c.files.length),
  };
}
