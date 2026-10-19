import { beforeEach, describe, expect, mock, test } from 'bun:test';

let repositoryAccessible = true;
let canWrite = false;
const readViewers = mock(async (_owner: string, _repo: string, _slug: string, _version: number) => ({
  viewers: [{ userId: 'private-viewer', username: 'private-viewer', viewCount: 1 }],
  totalViews: 1,
}));
const checkWrite = mock(async () => canWrite);

mock.module('../src/lib/auth', () => ({ auth: { api: { getSession: async () => null } } }));
mock.module('../src/lib/github/repository-access', () => ({
  getAccessibleRepositoryInfo: async () => repositoryAccessible ? { private: false } : null,
}));
mock.module('../src/lib/wiki/permissions', () => ({ checkRepositoryWriteAccess: checkWrite }));
mock.module('../src/lib/wiki/repository', () => ({
  getWikiPage: async () => ({ version: 3, isPublic: true, viewCount: 5 }),
  getWikiPageViewers: readViewers,
  insertWikiPages: async () => ({}),
  getWikiTableOfContents: async () => ({ pages: [], version: 0 }),
  incrementViewCount: async () => true,
  deleteWikiPage: async () => true,
  deleteRepositoryWiki: async () => 0,
  updateWikiPage: async () => null,
  createWikiPage: async () => null,
}));
mock.module('../src/lib/github', () => ({ createGitHubServiceForRepo: async () => ({}) }));
mock.module('../src/lib/ai/wiki-generator', () => ({ generateWikiWithCacheStreaming: async function* () {} }));
mock.module('../src/lib/wiki/file-collector', () => ({ collectRepositoryFiles: async () => [] }));
mock.module('../src/lib/utils/user-plan', () => ({
  getUserPlanAndKey: async () => ({}),
  getApiKeyForUser: async () => null,
}));
mock.module('../src/lib/utils/stargazer-perk', () => ({ checkStargazerPerk: async () => ({}) }));
mock.module('../src/db', () => ({ db: {} }));

const { wikiRouter } = await import('../src/lib/trpc/routes/wiki');
const input = { owner: 'owner', repo: 'repo', slug: 'intro' };
const context = (userId?: string) => ({
  session: userId ? { user: { id: userId } } : null,
  req: new Request('http://localhost:3000/api/trpc'),
});

beforeEach(() => {
  repositoryAccessible = true;
  canWrite = false;
  readViewers.mockClear();
  checkWrite.mockClear();
});

describe('wiki viewer identity access', () => {
  test('does not reveal identities to signed-out or read-only visitors', async () => {
    const anonymous = wikiRouter.createCaller(context());
    expect(await anonymous.getWikiPageViewers(input)).toEqual({ viewers: [], totalViews: 0, restricted: true });
    expect(checkWrite).not.toHaveBeenCalled();

    const reader = wikiRouter.createCaller(context('reader'));
    expect(await reader.getWikiPageViewers(input)).toEqual({ viewers: [], totalViews: 0, restricted: true });
    expect(checkWrite).toHaveBeenCalledTimes(1);
    expect(readViewers).not.toHaveBeenCalled();
  });

  test('returns identities only to a current repository writer', async () => {
    canWrite = true;
    const writer = wikiRouter.createCaller(context('writer'));
    const result = await writer.getWikiPageViewers(input);
    expect(result.restricted).toBe(false);
    expect(result.viewers[0]?.username).toBe('private-viewer');
    expect(readViewers).toHaveBeenCalledWith('owner', 'repo', 'intro', 3);
  });

  test('fails closed when current repository access cannot be verified', async () => {
    repositoryAccessible = false;
    canWrite = true;
    const writer = wikiRouter.createCaller(context('writer'));
    expect(await writer.getWikiPageViewers(input)).toEqual({ viewers: [], totalViews: 0, restricted: true });
    expect(readViewers).not.toHaveBeenCalled();
  });
});
