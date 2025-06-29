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

  static async createWithOAuth(session: BetterAuthSession, req?: Request): Promise<GitHubService | null> {
    const octokit = await GitHubAuthFactory.createWithOAuth(session, req);
    return octokit ? new GitHubService(octokit) : null;
  }

  static async createAuthenticated(session: unknown, req?: Request): Promise<GitHubService> {
    const octokit = await GitHubAuthFactory.createAuthenticated(session, req);
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

export async function createOAuthGitHubService(session: BetterAuthSession, req?: Request): Promise<GitHubService | null> {
  return GitHubService.createWithOAuth(session, req);
}

export async function createGitHubService(session: unknown, req?: Request): Promise<GitHubService> {
  return GitHubService.createAuthenticated(session, req);
}

// Re-export types for convenience
export type { RepositoryInfo, RepoSummary, GitHubFilesResponse, BetterAuthSession };
export { DEFAULT_MAX_FILES } from './types'; 