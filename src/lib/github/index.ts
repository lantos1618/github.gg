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
import { SessionData } from '@/lib/types/errors';

// Main GitHub service - simple facade that coordinates other services
export class GitHubService {
  private octokit: Octokit;
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
    maxFiles: number = 1000,
    path?: string
  ): Promise<GitHubFilesResponse> {
    return this.repositoryService.getRepositoryFiles(owner, repo, ref, maxFiles, path);
  }

  async getBranches(owner: string, repo: string): Promise<string[]> {
    return this.repositoryService.getBranches(owner, repo);
  }

  // User operations
  async getUserRepositories(username?: string): Promise<RepoSummary[]> {
    return this.userService.getUserRepositories(username);
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