import { Octokit } from '@octokit/rest';
import { GitHubAuthFactory } from './auth-factory';
import { RepositoryService } from './repository-service';
import { UserService } from './user-service';
import type {
  RepositoryInfo,
  RepoSummary,
  GitHubFilesResponse,
  BetterAuthSession
} from './types';
import { DEFAULT_MAX_FILES } from './types';
import { SessionData } from '@/lib/types/errors';

// Main GitHub service - simple facade that coordinates other services
export class GitHubService {
  public readonly octokit: Octokit;
  private repositoryService: RepositoryService;
  private userService: UserService;

  constructor(octokit: Octokit) {
    this.octokit = octokit;
    this.repositoryService = new RepositoryService(octokit);
    this.userService = new UserService(octokit);
  }

  // Repository operations
  async getRepositoryInfo(owner: string, repo: string): Promise<RepositoryInfo> {
    return this.repositoryService.getRepositoryInfo(owner, repo);
  }

  async getRepositoryDetails(owner: string, repo: string): Promise<RepoSummary> {
    return this.repositoryService.getRepositoryDetails(owner, repo);
  }

  async getRepositoryFiles(
    owner: string,
    repo: string,
    ref?: string,
    maxFiles: number = DEFAULT_MAX_FILES,
    path?: string
  ): Promise<GitHubFilesResponse> {
    return this.repositoryService.getRepositoryFiles(owner, repo, ref, maxFiles, path);
  }

  async getBranches(owner: string, repo: string): Promise<string[]> {
    return this.repositoryService.getBranches(owner, repo);
  }

  // User operations
  async getUserRepositories(username?: string, limit?: number): Promise<RepoSummary[]> {
    return this.userService.getUserRepositories(username, limit);
  }

  async hasStarredRepo(owner: string, repo: string): Promise<boolean> {
    return this.userService.hasStarredRepo(owner, repo);
  }

  // Cache operations
  clearCache(): void {
    this.repositoryService.clearCache();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return this.repositoryService.getCacheStats();
  }

  // Static factory methods
  static createPublic(): GitHubService {
    const octokit = GitHubAuthFactory.createPublic();
    return new GitHubService(octokit);
  }

  static async createWithOAuth(session: BetterAuthSession): Promise<GitHubService | null> {
    const octokit = await GitHubAuthFactory.createWithOAuth(session);
    return octokit ? new GitHubService(octokit) : null;
  }

  static async createAuthenticated(session: SessionData): Promise<GitHubService> {
    if (!session.accessToken) {
      throw new Error('No access token available');
    }

    const octokit = new Octokit({ auth: session.accessToken });
    return new GitHubService(octokit);
  }

  static async createForRepo(owner: string, repo: string, session?: BetterAuthSession, req?: Request): Promise<GitHubService> {
    // Keep the legacy factory on the same authorization path as tRPC routes.
    void req;
    return createGitHubServiceForRepo(owner, repo, session ?? null);
  }
}

// Convenience functions for backward compatibility
export function createPublicGitHubService(): GitHubService {
  return GitHubService.createPublic();
}

export async function createOAuthGitHubService(session: BetterAuthSession): Promise<GitHubService | null> {
  return GitHubService.createWithOAuth(session);
}

export async function createGitHubService(session: SessionData): Promise<GitHubService> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  const octokit = new Octokit({ auth: session.accessToken });
  return new GitHubService(octokit);
}

// New function to handle BetterAuthSession type from tRPC context
export async function createGitHubServiceFromSession(session: BetterAuthSession | null): Promise<GitHubService> {
  if (!session?.user?.id) {
    // Fallback to public service if no session
    return GitHubService.createPublic();
  }

  // A session alone cannot authorize a GitHub App installation for a
  // particular private repository. Use only the user's own OAuth token here.
  const oauthService = await GitHubService.createWithOAuth(session);
  if (oauthService) {
    return oauthService;
  }

  // Fallback to public service
  return GitHubService.createPublic();
}

// Repo-aware variant that also checks if the target repo's owner has a GitHub App installation.
// Use this when the caller knows the target owner/repo (e.g. files, scorecard, diagram routes).
export async function createGitHubServiceForRepo(
  owner: string,
  repo: string,
  session: BetterAuthSession | null
): Promise<GitHubService> {
  const { getInstallationIdForRepo, getInstallationToken } = await import('./app');

  const tag = `[gh-auth ${owner}/${repo}]`;
  const logStep = (step: string, extra?: Record<string, unknown>) => {
    if (extra) console.log(`${tag} ${step}`, extra);
    else console.log(`${tag} ${step}`);
  };

  let oauthOctokitPromise: Promise<Octokit | null> | null = null;
  const getOAuthOctokit = (): Promise<Octokit | null> => {
    if (!session?.user?.id) return Promise.resolve(null);
    oauthOctokitPromise ??= GitHubAuthFactory.createWithOAuth(session);
    return oauthOctokitPromise;
  };

  // The session's cached githubUsername can be stale after a GitHub rename.
  // Resolve the current account from the authenticated user's OAuth token on
  // every private-repository request before checking that account's access.
  let currentUsernamePromise: Promise<string | null> | null = null;
  const getCurrentGitHubUsername = (): Promise<string | null> => {
    currentUsernamePromise ??= (async () => {
      const oauthOctokit = await getOAuthOctokit();
      if (!oauthOctokit) return null;
      try {
        const { data } = await oauthOctokit.request('GET /user');
        return data.login?.toLowerCase() ?? null;
      } catch (err) {
        logStep('current GitHub identity check failed', {
          status: (err as { status?: number })?.status,
        });
        return null;
      }
    })();
    return currentUsernamePromise;
  };

  const verifyCollaborator = async (appOctokit: Octokit, username: string): Promise<boolean> => {
    try {
      await appOctokit.request('GET /repos/{owner}/{repo}/collaborators/{username}', {
        owner, repo, username,
      });
      return true;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      logStep('collaborator check failed', { username, status });
      return false;
    }
  };

  // Org-admin fallback: org owners have admin on every repo in the org but may
  // not appear in the explicit collaborators list. Use the user's OAuth token
  // (read:org scope) to confirm they're an active admin of the owning org.
  const verifyOrgAdmin = async (orgLogin: string): Promise<boolean> => {
    try {
      const oauthOctokit = await getOAuthOctokit();
      if (!oauthOctokit) return false;
      const { data } = await oauthOctokit.request('GET /user/memberships/orgs/{org}', {
        org: orgLogin,
      });
      return data?.state === 'active' && data?.role === 'admin';
    } catch (err) {
      const status = (err as { status?: number })?.status;
      logStep('org admin check failed', { org: orgLogin, status });
      return false;
    }
  };

  const verifyPrivateRepoAccess = async (appOctokit: Octokit): Promise<boolean> => {
    const username = await getCurrentGitHubUsername();
    if (!username) {
      logStep('private repo — current GitHub identity could not be verified');
      return false;
    }

    // GitHub's collaborator check includes direct, team, organization, and
    // owner access. The org-admin lookup is a fallback for org ownership.
    if (username === owner.toLowerCase()) return true;
    if (await verifyCollaborator(appOctokit, username)) return true;
    if (await verifyOrgAdmin(owner)) return true;
    return false;
  };

  // 1. Try the user's own linked GitHub App installation.
  if (session?.user?.id) {
    const appOctokit = await GitHubAuthFactory.createWithApp(session);
    if (appOctokit) {
      try {
        const appService = new GitHubService(appOctokit);
        const repoInfo = await appService.getRepositoryInfo(owner, repo);
        if (!repoInfo.private || await verifyPrivateRepoAccess(appService.octokit)) {
          logStep('using user-linked installation');
          return appService;
        }
        logStep('user-linked installation cannot authorize private repo');
      } catch {
        logStep('user-linked installation cannot access repo');
      }
    }
  }

  // 2. Try the repo-owner's GitHub App installation.
  // Wrap the whole step in try/catch so a flaky GitHub API or revoked install
  // can never cause this function to throw — callers downstream (publicGetScorecard,
  // github.files) treat any throw here as "Unable to access repository".
  try {
    const installationId = await getInstallationIdForRepo(owner, repo);
    if (installationId) {
      logStep('found repo-owner installation', { installationId });
      const token = await getInstallationToken(installationId);
      const appOctokit = new Octokit({ auth: token });
      const { data: repoData } = await appOctokit.request('GET /repos/{owner}/{repo}', { owner, repo });

      if (!repoData.private) {
        logStep('public repo, serving via app token');
        return new GitHubService(appOctokit);
      }

      if (await verifyPrivateRepoAccess(appOctokit)) {
        logStep('current GitHub user verified for private repo');
        return new GitHubService(appOctokit);
      }

      logStep('private repo — user not authorized via app installation');
    } else {
      logStep('no app installation found for repo owner');
    }
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = (err as { message?: string })?.message;
    logStep('repo-owner installation path failed', { status, message });
  }

  // 3. OAuth fallback (public repos only — we don't request 'repo' scope).
  if (session?.user?.id) {
    const oauthService = await GitHubService.createWithOAuth(session);
    if (oauthService) {
      logStep('falling back to OAuth');
      return oauthService;
    }
  }

  // 4. Public.
  logStep('falling back to public service');
  return GitHubService.createPublic();
}

// Specialized function for user operations that prioritizes OAuth
export async function createGitHubServiceForUserOperations(session: BetterAuthSession | null): Promise<GitHubService> {
  if (!session?.user?.id) {
    // Fallback to public service if no session
    return GitHubService.createPublic();
  }

  // For user operations like getUserRepositories, prioritize OAuth to get complete access
  const oauthService = await GitHubService.createWithOAuth(session);
  if (oauthService) {
    return oauthService;
  }

  // Without a target repository, an installation token cannot be authorized
  // for the current user. Fall back to anonymous public access.
  return GitHubService.createPublic();
}

// Re-export types for convenience
export type { RepositoryInfo, RepoSummary, GitHubFilesResponse, BetterAuthSession };
export { DEFAULT_MAX_FILES } from './types';
