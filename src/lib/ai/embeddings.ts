import { google } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';
import type { DeveloperProfile } from '@/lib/types/profile';

// Gemini text-embedding-004 outputs 768 dimensions
export const EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Generate a text embedding using Gemini's text-embedding-004 model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts in a batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: google.embedding(EMBEDDING_MODEL),
    values: texts,
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
 * Generate embedding for a job description
 */
export async function generateJobEmbedding(jobDescription: string): Promise<number[]> {
  // Prefix to give context that this is a job listing
  const prefixedText = `Job Requirements: ${jobDescription}`;
  return generateEmbedding(prefixedText);
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
