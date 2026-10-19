import { beforeEach, describe, expect, mock, test } from 'bun:test';

let isPrivate = true;
let oauthLogin = 'bob';
let oauthAvailable = true;
let identityCheckFails = false;
let collaboratorAllowed = false;
let orgAdminAllowed = false;
const checkedCollaborators: string[] = [];
let profileRows: Array<{ profileData: unknown; updatedAt: Date }> = [];

const appOctokit = {
  request: async (route: string, params: { username?: string }) => {
    if (route === 'GET /repos/{owner}/{repo}') {
      return { data: {
        name: 'secret', description: null, stargazers_count: 0,
        forks_count: 0, language: null, topics: [], html_url: 'https://github.com/alice/secret',
        default_branch: 'main', updated_at: '2026-10-19T00:00:00Z', private: isPrivate,
      } };
    }
    if (route === 'GET /repos/{owner}/{repo}/collaborators/{username}') {
      checkedCollaborators.push(params.username ?? '');
      if (collaboratorAllowed) return { status: 204, data: null };
      throw { status: 404 };
    }
    throw new Error(`Unexpected app request: ${route}`);
  },
};

const oauthOctokit = {
  request: async (route: string) => {
    if (route === 'GET /user') {
      if (identityCheckFails) throw { status: 401 };
      return { data: { login: oauthLogin } };
    }
    if (route === 'GET /user/memberships/orgs/{org}') {
      if (orgAdminAllowed) return { data: { state: 'active', role: 'admin' } };
      throw { status: 404 };
    }
    throw new Error(`Unexpected OAuth request: ${route}`);
  },
};

mock.module('../src/lib/github/auth-factory', () => ({
  GitHubAuthFactory: class {
    static createWithApp = async () => appOctokit;
    static createWithOAuth = async () => oauthAvailable ? oauthOctokit : null;
    static createPublic = () => ({ request: async () => { throw { status: 404 }; } });
  },
}));

mock.module('../src/lib/github/app', () => ({
  getInstallationIdForRepo: async () => null,
  getInstallationToken: async () => 'unused',
}));

mock.module('../src/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: async () => profileRows }),
        }),
      }),
    }),
  },
}));

const { createGitHubServiceForRepo, createGitHubServiceFromSession, GitHubService } = await import('../src/lib/github');
const { getProfileData, isCurrentGitHubProfileOwner } = await import('../src/lib/profile/service');

// The cached session login is intentionally wrong: current OAuth identity wins.
const session = { user: { id: 'user-1', githubUsername: 'alice' } } as Parameters<typeof createGitHubServiceForRepo>[2];

beforeEach(() => {
  isPrivate = true;
  oauthLogin = 'bob';
  oauthAvailable = true;
  identityCheckFails = false;
  collaboratorAllowed = false;
  orgAdminAllowed = false;
  checkedCollaborators.length = 0;
  profileRows = [];
});

describe('private repository authorization', () => {
  test('a linked installation does not grant a stale session username private access', async () => {
    const service = await createGitHubServiceForRepo('alice', 'secret', session);
    expect(service.octokit).toBe(oauthOctokit);
    expect(checkedCollaborators).toEqual(['bob']);
  });

  test('a current collaborator can use the linked installation', async () => {
    collaboratorAllowed = true;
    const service = await createGitHubServiceForRepo('alice', 'secret', session);
    expect(service.octokit).toBe(appOctokit);
    expect(checkedCollaborators).toEqual(['bob']);
  });

  test('an unverified GitHub identity cannot use the installation', async () => {
    identityCheckFails = true;
    const service = await createGitHubServiceForRepo('alice', 'secret', session);
    expect(service.octokit).toBe(oauthOctokit);
    expect(checkedCollaborators).toEqual([]);
  });

  test('legacy factories do not expose an installation token without repo authorization', async () => {
    const scopedService = await GitHubService.createForRepo('alice', 'secret', session);
    const sessionService = await createGitHubServiceFromSession(session);
    expect(scopedService.octokit).toBe(oauthOctokit);
    expect(sessionService.octokit).toBe(oauthOctokit);
  });

  test('public repositories do not require a private permission check', async () => {
    isPrivate = false;
    oauthAvailable = false;
    const service = await createGitHubServiceForRepo('alice', 'secret', session);
    expect(service.octokit).toBe(appOctokit);
    expect(checkedCollaborators).toEqual([]);
  });
});

describe('public profile privacy', () => {
  test('public profile data has no email even when no profile exists', async () => {
    const data = await getProfileData('alice');
    expect(data).toEqual({ profile: null, cached: false, stale: false, lastUpdated: null });
    expect(data).not.toHaveProperty('email');
  });

  test('legacy profile without public source provenance is quarantined', async () => {
    profileRows = [{ profileData: { summary: 'Developer profile' }, updatedAt: new Date() }];
    const data = await getProfileData('alice');
    expect(data.cached).toBe(false);
    expect(data.profile).toBeNull();
    expect(data).not.toHaveProperty('email');
  });

  test('email owner check uses current GitHub identity', async () => {
    expect(await isCurrentGitHubProfileOwner(session, 'alice')).toBe(false);
    expect(await isCurrentGitHubProfileOwner(session, 'bob')).toBe(true);
    identityCheckFails = true;
    expect(await isCurrentGitHubProfileOwner(session, 'bob')).toBe(false);
  });
});
