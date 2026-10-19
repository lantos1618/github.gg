import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { developerProfileCache } from '../src/db/schema';

const reserveEmbedding = mock(async () => false);
const reserveRepoRequest = mock(async (): Promise<'allowed' | 'limited' | 'unavailable'> => 'allowed');
const generateEmbedding = mock(async () => [0.1, 0.2]);
const checkRepo = mock(async () => ({ private: false }));

const repoRow = {
  userId: 'owner-id',
  isPrivate: false,
  repoOwner: 'alice',
  repoName: 'react-tools',
  ref: 'main',
  overallScore: 92,
  version: 1,
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};
const profileRows = [
  {
    username: 'alice',
    profileData: { visibilityVerified: true, summary: 'React engineer', profileConfidence: 85 },
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    version: 1,
  },
  {
    username: 'bob',
    profileData: { visibilityVerified: true, summary: 'React engineer', profileConfidence: 20 },
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    version: 1,
  },
];

const dbExecute = mock(async () => [repoRow]);
const dbSelect = mock(() => {
  const builder = {
    from: () => builder,
    groupBy: () => builder,
    as: () => ({
      username: developerProfileCache.username,
      maxVersion: developerProfileCache.version,
    }),
    innerJoin: () => builder,
    where: () => builder,
    orderBy: () => builder,
    limit: () => profileRows,
  };
  return builder;
});

mock.module('../src/lib/auth', () => ({ auth: { api: { getSession: async () => null } } }));
mock.module('../src/db', () => ({ db: { execute: dbExecute, select: dbSelect } }));
mock.module('../src/lib/rate-limit/semantic-search', () => ({
  reserveSemanticSearchEmbedding: reserveEmbedding,
  reserveRepoSearchRequest: reserveRepoRequest,
}));
mock.module('../src/lib/ai/embeddings', () => ({
  generateEmbedding,
  formatEmbeddingForPg: () => '[0.1,0.2]',
}));
mock.module('../src/lib/github/repository-access', () => ({
  getAccessibleRepositoryInfo: checkRepo,
}));
mock.module('../src/lib/profile/public-provenance', () => ({
  filterCurrentlyPublicProfiles: async <T>(rows: T[]) => rows,
}));

const { repoSearchRouter } = await import('../src/lib/trpc/routes/repo-search');
const { profileSearchRouter } = await import('../src/lib/trpc/routes/profile/search');
const context = () => ({
  session: null,
  req: new Request('https://www.github.gg/api/trpc'),
});

beforeEach(() => {
  reserveEmbedding.mockReset();
  reserveEmbedding.mockImplementation(async () => false);
  reserveRepoRequest.mockReset();
  reserveRepoRequest.mockImplementation(async () => 'allowed');
  generateEmbedding.mockClear();
  checkRepo.mockClear();
  dbExecute.mockReset();
  dbExecute.mockImplementation(async () => [repoRow]);
  dbSelect.mockClear();
});

describe('public search paid embedding budgets', () => {
  test('repository search uses text results without a paid embedding when its budget is spent', async () => {
    const result = await repoSearchRouter.createCaller(context()).searchRepos({ query: 'react' });
    expect(result.mode).toBe('text');
    expect(result.results.map(row => row.repoName)).toEqual(['react-tools']);
    expect(reserveEmbedding).toHaveBeenCalledTimes(1);
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(checkRepo).toHaveBeenCalledTimes(1);
  });

  test('Redis outage keeps capped repository text search available', async () => {
    reserveRepoRequest.mockImplementation(async () => 'unavailable');
    const result = await repoSearchRouter.createCaller(context()).searchRepos({ query: 'react', limit: 20 });
    expect(result.mode).toBe('text');
    expect(result.results).toHaveLength(1);
    expect(reserveEmbedding).not.toHaveBeenCalled();
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(checkRepo).toHaveBeenCalledTimes(1);
  });

  test('exhausted request budget stops repository visibility fan-out', async () => {
    reserveRepoRequest.mockImplementation(async () => 'limited');
    const result = await repoSearchRouter.createCaller(context()).searchRepos({ query: 'react' });
    expect(result.mode).toBe('rate_limited');
    expect(result.results).toEqual([]);
    expect(dbExecute).not.toHaveBeenCalled();
    expect(checkRepo).not.toHaveBeenCalled();
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  test('profile search uses text results and confidence filter without a paid embedding', async () => {
    const result = await profileSearchRouter.createCaller(context()).searchProfiles({
      query: 'React', minConfidence: 50,
    });
    expect(result.results.map(row => row.username)).toEqual(['alice']);
    expect(reserveEmbedding).toHaveBeenCalledTimes(1);
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(dbSelect).toHaveBeenCalledTimes(2);
  });

  test('approved semantic search calls the embedding provider', async () => {
    reserveEmbedding.mockImplementation(async () => true);
    dbExecute.mockImplementationOnce(async () => [{ ...repoRow, similarity_score: 0.9 }]);
    const result = await repoSearchRouter.createCaller(context()).searchRepos({ query: 'react' });
    expect(result.mode).toBe('semantic');
    expect(generateEmbedding).toHaveBeenCalledTimes(1);
  });

  test('rejects oversized queries and result windows before making paid calls', async () => {
    const repos = repoSearchRouter.createCaller(context());
    const profiles = profileSearchRouter.createCaller(context());
    await expect(repos.searchRepos({ query: 'x'.repeat(201) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(repos.searchRepos({ query: 'react', limit: 21 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(profiles.searchProfiles({ query: 'x'.repeat(201) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(profiles.searchProfiles({ query: 'react', limit: 101 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(profiles.searchProfiles({ query: 'react', offset: 200 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(profiles.searchProfiles({ skills: Array(21).fill('react') })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(reserveRepoRequest).not.toHaveBeenCalled();
    expect(reserveEmbedding).not.toHaveBeenCalled();
  });
});
