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

  static async createWithApp(session: BetterAuthSession): Promise<GitHubService | null> {
    const octokit = await GitHubAuthFactory.createWithApp(session);
    return octokit ? new GitHubService(octokit) : null;
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
    const repositoryService = await RepositoryService.createForRepo(owner, repo, session, req);
    return new GitHubService(repositoryService['octokit']);
  }
}

// Convenience functions for backward compatibility
export function createPublicGitHubService(): GitHubService {
  return GitHubService.createPublic();
}

export async function createGitHubAppService(session: BetterAuthSession): Promise<GitHubService | null> {
  return GitHubService.createWithApp(session);
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

  // Try to create service with GitHub App first
  const appService = await GitHubService.createWithApp(session);
  if (appService) {
    return appService;
  }

  // Try to create service with OAuth
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

  const getGitHubUsername = (): string | null => {
    if (!session?.user) return null;
    const user = session.user as typeof session.user & { githubUsername?: string };
    return user.githubUsername?.toLowerCase() ?? null;
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
    if (!session?.user?.id) return false;
    try {
      const oauthOctokit = await GitHubAuthFactory.createWithOAuth(session);
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

  const username = getGitHubUsername();
  if (session?.user?.id && !username) {
    logStep('signed-in user has no githubUsername — collaborator checks will be skipped');
  }

  // 1. Try the user's own linked GitHub App installation.
  if (session?.user?.id) {
    const appService = await GitHubService.createWithApp(session);
    if (appService) {
      try {
        await appService.getRepositoryInfo(owner, repo);
        logStep('using user-linked installation');
        return appService;
      } catch {
        logStep('user-linked installation cannot access repo');
      }
    }
  }

  // 2. Try the repo-owner's GitHub App installation.
  const installationId = await getInstallationIdForRepo(owner, repo);
  if (installationId) {
    logStep('found repo-owner installation', { installationId });
    const token = await getInstallationToken(installationId);
    const appOctokit = new Octokit({ auth: token });

    try {
      const { data: repoData } = await appOctokit.request('GET /repos/{owner}/{repo}', { owner, repo });

      if (!repoData.private) {
        logStep('public repo, serving via app token');
        return new GitHubService(appOctokit);
      }

      // Private repo: verify the signed-in user is authorized.
      //   a) They own the repo (user-owned).
      //   b) They're a collaborator (covers explicit + team-based access).
      //   c) They're an admin of the owning org (org owners with implicit access).
      if (username) {
        if (username === owner.toLowerCase()) {
          logStep('user owns the repo');
          return new GitHubService(appOctokit);
        }
        if (await verifyCollaborator(appOctokit, username)) {
          logStep('user verified as collaborator');
          return new GitHubService(appOctokit);
        }
        if (await verifyOrgAdmin(owner)) {
          logStep('user verified as org admin');
          return new GitHubService(appOctokit);
        }
      }

      logStep('private repo — user not authorized via app installation');
    } catch (err) {
      const status = (err as { status?: number })?.status;
      logStep('app token cannot read repo metadata', { status });
    }
  } else {
    logStep('no app installation found for repo owner');
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

  // Fallback to GitHub App if OAuth is not available
  const appService = await GitHubService.createWithApp(session);
  if (appService) {
    return appService;
  }

  // Fallback to public service
  return GitHubService.createPublic();
}

// Re-export types for convenience
export type { RepositoryInfo, RepoSummary, GitHubFilesResponse, BetterAuthSession };
export { DEFAULT_MAX_FILES } from './types'; 