import { afterEach, describe, expect, mock, test } from 'bun:test';
import { getAccessibleRepositoryInfo } from '../src/lib/github/repository-access';

const getRepositoryInfo = mock(async () => ({
  name: 'repo',
  description: null,
  stargazersCount: 0,
  forksCount: 0,
  language: null,
  topics: [],
  url: 'https://github.com/owner/repo',
  defaultBranch: 'main',
  updatedAt: new Date().toISOString(),
  private: false,
}));
const createGitHubServiceForRepo = mock(async () => ({ getRepositoryInfo }));

afterEach(() => {
  getRepositoryInfo.mockClear();
  createGitHubServiceForRepo.mockClear();
});

describe('cached repository artifact access', () => {
  test('serves a verified public repository to a signed-out caller', async () => {
    getRepositoryInfo.mockResolvedValueOnce({
      name: 'repo', description: null, stargazersCount: 0, forksCount: 0,
      language: null, topics: [], url: 'https://github.com/owner/repo',
      defaultBranch: 'main', updatedAt: new Date().toISOString(), private: false,
    });
    expect((await getAccessibleRepositoryInfo('owner', 'repo', null, createGitHubServiceForRepo))?.private).toBe(false);
  });

  test('does not serve a private repository to a signed-out caller', async () => {
    getRepositoryInfo.mockResolvedValueOnce({
      name: 'repo', description: null, stargazersCount: 0, forksCount: 0,
      language: null, topics: [], url: 'https://github.com/owner/repo',
      defaultBranch: 'main', updatedAt: new Date().toISOString(), private: true,
    });
    expect(await getAccessibleRepositoryInfo('owner', 'repo', null, createGitHubServiceForRepo)).toBeNull();
  });

  test('fails closed when GitHub cannot establish visibility', async () => {
    getRepositoryInfo.mockRejectedValueOnce(new Error('GitHub unavailable'));
    expect(await getAccessibleRepositoryInfo('owner', 'repo', null, createGitHubServiceForRepo)).toBeNull();
  });
});
