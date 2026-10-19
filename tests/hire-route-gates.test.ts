import { beforeEach, expect, mock, test } from 'bun:test';

let denyAccess = true;
let isByok = false;
let embeddingCalls = 0;
let rankingCalls = 0;
let selectedEmbeddingKey = '';
let selectedRankingKey = '';
const usageRows: Array<Record<string, unknown>> = [];

const procedure = {
  input() { return this; },
  mutation(handler: unknown) { return handler; },
};
mock.module('../src/lib/trpc/trpc', () => ({
  router: (routes: unknown) => routes,
  protectedProcedure: procedure,
}));
mock.module('../src/lib/trpc/admin', () => ({ adminProcedure: procedure }));
mock.module('../src/lib/trpc/helpers/validate-plan-and-key', () => ({
  validatePlanAndKey: async () => {
    if (denyAccess) throw new Error('Active subscription or monthly allowance required');
    return { keyInfo: { apiKey: 'selected-hire-key', isByok } };
  },
}));
mock.module('../src/lib/ai/embeddings', () => ({
  EMBEDDING_MODEL: 'gemini-embedding-001',
  generateJobEmbedding: async (_description: string, apiKey: string) => {
    embeddingCalls += 1;
    selectedEmbeddingKey = apiKey;
    return { embedding: [0.5], inputTokens: 25 };
  },
  generateProfileEmbedding: async () => [0.5],
  formatEmbeddingForPg: () => '[0.5]',
}));
mock.module('../src/lib/ai/candidate-ranker', () => ({
  MAX_RANKED_CANDIDATES: 10,
  rankCandidates: async (_description: string, candidates: Array<Record<string, unknown>>, apiKey: string) => {
    rankingCalls += 1;
    selectedRankingKey = apiKey;
    return {
      candidates: candidates.map(candidate => ({
        ...candidate,
        fit: {
          fitScore: 80,
          fitReason: 'Good fit',
          keyStrengths: ['TypeScript'],
          potentialGaps: [],
          interviewFocus: ['Systems design'],
          estimatedSalaryRange: { min: 100000, max: 150000, currency: 'USD' },
        },
      })),
      usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    };
  },
}));
mock.module('../src/lib/profile/public-provenance', () => ({
  filterCurrentlyPublicProfiles: async (rows: unknown) => rows,
}));
mock.module('../src/db', () => ({
  db: {
    insert: () => ({ values: async (row: Record<string, unknown>) => { usageRows.push(row); } }),
    execute: async () => [{
      username: 'candidate',
      profileData: { summary: 'TypeScript developer', profileConfidence: 90 },
      similarity_score: 0.8,
    }],
  },
}));

const { hireRouter } = await import('../src/lib/trpc/routes/hire');
const matchCandidates = (hireRouter as unknown as {
  matchCandidates: (args: { input: Record<string, unknown>; ctx: { user: { id: string } } }) => Promise<unknown>;
}).matchCandidates;
const args = {
  input: { jobDescription: 'A detailed TypeScript software engineer role with backend experience', limit: 1 },
  ctx: { user: { id: 'user-1' } },
};

beforeEach(() => {
  denyAccess = true;
  isByok = false;
  embeddingCalls = 0;
  rankingCalls = 0;
  selectedEmbeddingKey = '';
  selectedRankingKey = '';
  usageRows.length = 0;
});

test('subscription or quota denial stops hire before any provider call', async () => {
  await expect(matchCandidates(args)).rejects.toThrow('Active subscription or monthly allowance required');
  expect(embeddingCalls).toBe(0);
  expect(rankingCalls).toBe(0);
  expect(usageRows).toHaveLength(0);
});

test('hire uses the BYOK key and records embedding plus ranking usage separately', async () => {
  denyAccess = false;
  isByok = true;
  const result = await matchCandidates(args) as { candidates: unknown[] };
  expect(result.candidates).toHaveLength(1);
  expect(selectedEmbeddingKey).toBe('selected-hire-key');
  expect(selectedRankingKey).toBe('selected-hire-key');
  expect(usageRows).toMatchObject([
    { userId: 'user-1', feature: 'hire-match', model: 'gemini-embedding-001', inputTokens: 25, outputTokens: 0, totalTokens: 25, isByok: true },
    { userId: 'user-1', feature: 'hire-match', model: 'gemini-3.5-flash-lite', inputTokens: 100, outputTokens: 20, totalTokens: 120, isByok: true },
  ]);
});
