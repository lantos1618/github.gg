import { expect, test } from 'bun:test';
import { generateJobEmbedding, EMBEDDING_DIMENSIONS } from '../src/lib/ai/embeddings';
import { MAX_RANKED_CANDIDATES, rankCandidates } from '../src/lib/ai/candidate-ranker';
import type { DeveloperProfile } from '../src/lib/types/profile';

test('job embedding uses the selected key and records Google-reported tokens', async () => {
  const originalFetch = globalThis.fetch;
  let seenKey: string | null = null;
  let seenBody = '';
  globalThis.fetch = async (_input, init) => {
    seenKey = new Headers(init?.headers).get('x-goog-api-key');
    seenBody = String(init?.body);
    return new Response(JSON.stringify({
      embedding: { values: Array(EMBEDDING_DIMENSIONS).fill(0.5) },
      usageMetadata: { promptTokenCount: 42 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const result = await generateJobEmbedding('A detailed test job description', 'selected-byok-key');
    expect(result.embedding).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(result.inputTokens).toBe(42);
    expect(seenKey).toBe('selected-byok-key');
    expect(seenBody).toContain('A detailed test job description');
    expect(JSON.parse(seenBody).outputDimensionality).toBe(EMBEDDING_DIMENSIONS);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('job embedding rejects a response without billable usage metadata', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    embedding: { values: Array(EMBEDDING_DIMENSIONS).fill(0.5) },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    await expect(generateJobEmbedding('A detailed test job description', 'selected-byok-key'))
      .rejects.toThrow('Gemini embedding response was incomplete');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('candidate ranking caps model calls and sums provider usage on the selected key', async () => {
  const originalFetch = globalThis.fetch;
  const keys: string[] = [];
  globalThis.fetch = async (_input, init) => {
    keys.push(new Headers(init?.headers).get('x-goog-api-key') || '');
    return new Response(JSON.stringify({
      candidates: [{
        content: { role: 'model', parts: [{ text: JSON.stringify({
          fitScore: 80,
          fitReason: 'Good fit',
          keyStrengths: ['TypeScript'],
          potentialGaps: [],
          interviewFocus: ['Systems design'],
          estimatedSalaryRange: { min: 100000, max: 150000, currency: 'USD' },
        }) }] },
        finishReason: 'STOP',
      }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5, totalTokenCount: 125 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      username: `candidate-${index}`,
      profile: { summary: 'TypeScript developer' } as DeveloperProfile,
      similarityScore: 0.8,
    }));
    const result = await rankCandidates('A detailed test job description', candidates, 'ranking-byok-key');
    expect(result.candidates).toHaveLength(MAX_RANKED_CANDIDATES);
    expect(keys).toHaveLength(MAX_RANKED_CANDIDATES);
    expect(keys.every(key => key === 'ranking-byok-key')).toBe(true);
    expect(result.usage).toEqual({ inputTokens: 1000, outputTokens: 250, totalTokens: 1250 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
