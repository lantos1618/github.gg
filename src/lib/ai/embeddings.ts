import { embed, embedMany } from 'ai';
import type { DeveloperProfile } from '@/lib/types/profile';
import { createPlatformGeminiModels } from './models';

// gemini-embedding-001 with outputDimensionality=768 — keeps the existing
// vector(768) column shape. text-embedding-004 (the previous model) was
// retired from the v1beta endpoint in 2026 and now 404s on embedContent calls.
export const EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_MODEL = 'gemini-embedding-001';

// Shared provider options pinning output dimensions so every call writes
// a 768-dim vector even though the model's native dim is 3072.
const PROVIDER_OPTIONS = {
  google: { outputDimensionality: EMBEDDING_DIMENSIONS },
};

/**
 * Generate a text embedding using the current Gemini embedding model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: createPlatformGeminiModels().embedding,
    value: text,
    providerOptions: PROVIDER_OPTIONS,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts in a batch.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: createPlatformGeminiModels().embedding,
    values: texts,
    providerOptions: PROVIDER_OPTIONS,
  });
  return embeddings;
}

/**
 * Convert a developer profile to embeddable text
 * Includes: summary, skills with scores, archetype, tech stack
 */
export function profileToEmbeddingText(profile: DeveloperProfile): string {
  const parts: string[] = [];

  // Summary
  if (profile.summary) {
    parts.push(`Summary: ${profile.summary}`);
  }

  // Developer archetype
  if (profile.developerArchetype) {
    parts.push(`Developer Type: ${profile.developerArchetype}`);
  }

  // Skills with scores
  if (profile.skillAssessment && profile.skillAssessment.length > 0) {
    const skills = profile.skillAssessment
      .map(s => `${s.metric} (${s.score}/10)`)
      .join(', ');
    parts.push(`Skills: ${skills}`);
  }

  // Tech stack
  if (profile.techStack && profile.techStack.length > 0) {
    const tech = profile.techStack
      .map(t => `${t.name} (${t.type})`)
      .join(', ');
    parts.push(`Tech Stack: ${tech}`);
  }

  // Development style
  if (profile.developmentStyle && profile.developmentStyle.length > 0) {
    const styles = profile.developmentStyle
      .map(s => s.metric)
      .join(', ');
    parts.push(`Development Style: ${styles}`);
  }

  // Top repos (names and significance)
  if (profile.topRepos && profile.topRepos.length > 0) {
    const repos = profile.topRepos
      .slice(0, 5)
      .map(r => `${r.name} (significance: ${r.significanceScore}/10)`)
      .join(', ');
    parts.push(`Notable Projects: ${repos}`);
  }

  return parts.join('\n');
}

/**
 * Generate embedding for a developer profile
 */
export async function generateProfileEmbedding(profile: DeveloperProfile): Promise<number[]> {
  const text = profileToEmbeddingText(profile);
  return generateEmbedding(text);
}

/**
 * Generate a job-description embedding and read the provider's exact token
 * count. The AI SDK currently discards Gemini's embedding usageMetadata, so
 * this one metered path uses the documented single-item REST response.
 */
export async function generateJobEmbedding(
  jobDescription: string,
  apiKey: string,
): Promise<{ embedding: number[]; inputTokens: number }> {
  if (!apiKey) throw new Error('Gemini API key is not configured');
  const prefixedText = `Job Requirements: ${jobDescription}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: prefixedText }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error('Gemini embedding request failed');

  const data = await response.json() as {
    embedding?: { values?: number[] };
    usageMetadata?: { promptTokenCount?: number };
  };
  const embedding = data.embedding?.values;
  const inputTokens = data.usageMetadata?.promptTokenCount;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS ||
      !embedding.every(Number.isFinite) ||
      typeof inputTokens !== 'number' || !Number.isSafeInteger(inputTokens) || inputTokens <= 0) {
    throw new Error('Gemini embedding response was incomplete');
  }
  return { embedding, inputTokens };
}

// text-embedding-004 has a token budget around ~2k. Markdown scorecards routinely
// run longer than that, so trim before embedding. Character cap is conservative
// (~1 token per 4 chars in English prose, less in code blocks).
const SCORECARD_EMBED_CHAR_LIMIT = 6000;

interface ScorecardEmbeddingInput {
  repoOwner: string;
  repoName: string;
  overallScore: number;
  markdown: string;
}

/**
 * Build the text we embed for a repository scorecard. Front-loads the repo
 * identifier so a query like "github.gg" still surfaces this repo even if
 * the markdown body never mentions the name.
 */
export function scorecardToEmbeddingText(input: ScorecardEmbeddingInput): string {
  const head = `Repository: ${input.repoOwner}/${input.repoName}\nOverall Score: ${input.overallScore}/100`;
  const body = input.markdown.slice(0, SCORECARD_EMBED_CHAR_LIMIT);
  return `${head}\n\n${body}`;
}

/**
 * Generate embedding for a repository scorecard.
 */
export async function generateScorecardEmbedding(input: ScorecardEmbeddingInput): Promise<number[]> {
  return generateEmbedding(scorecardToEmbeddingText(input));
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1, where 1 is most similar
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Format embedding array for PostgreSQL vector type
 * Converts [1.0, 2.0, 3.0] to '[1.0,2.0,3.0]'
 */
export function formatEmbeddingForPg(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
