import { Octokit } from '@octokit/rest';
import { GitHubAuthFactory } from './auth-factory';
import { RepositoryService } from './repository-service';
import { UserService } from './user-service';
import { devGitHubService } from './dev-github';
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

  // Check if we should use dev mode
  private isDevMode(): boolean {
    return process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true';
  }

  // Repository operations
  async getRepositoryInfo(owner: string, repo: string): Promise<RepositoryInfo> {
    if (this.isDevMode()) {
      const mockRepo = await devGitHubService.getRepo(owner, repo);
      return {
        id: mockRepo.id,
        name: mockRepo.name,
        full_name: mockRepo.full_name,
        owner: mockRepo.owner,
        description: mockRepo.description,
        private: mockRepo.private,
        fork: mockRepo.fork,
        created_at: mockRepo.created_at,
        updated_at: mockRepo.updated_at,
        pushed_at: mockRepo.pushed_at,
        size: mockRepo.size,
        stargazers_count: mockRepo.stargazers_count,
        watchers_count: mockRepo.watchers_count,
        language: mockRepo.language,
        has_issues: mockRepo.has_issues,
        has_projects: mockRepo.has_projects,
        has_downloads: mockRepo.has_downloads,
        has_wiki: mockRepo.has_wiki,
        has_pages: mockRepo.has_pages,
        has_discussions: mockRepo.has_discussions,
        forks_count: mockRepo.forks_count,
        archived: mockRepo.archived,
        disabled: mockRepo.disabled,
        license: mockRepo.license,
        default_branch: mockRepo.default_branch,
        topics: mockRepo.topics,
        visibility: mockRepo.visibility,
        open_issues_count: mockRepo.open_issues_count,
        network_count: mockRepo.network_count,
        subscribers_count: mockRepo.subscribers_count
      };
    }
    return this.repositoryService.getRepositoryInfo(owner, repo);
  }

  async getRepositoryDetails(owner: string, repo: string): Promise<RepoSummary> {
    if (this.isDevMode()) {
      const mockRepo = await devGitHubService.getRepo(owner, repo);
      return {
        id: mockRepo.id,
        name: mockRepo.name,
        full_name: mockRepo.full_name,
        owner: mockRepo.owner,
        description: mockRepo.description,
        private: mockRepo.private,
        fork: mockRepo.fork,
        created_at: mockRepo.created_at,
        updated_at: mockRepo.updated_at,
        pushed_at: mockRepo.pushed_at,
        size: mockRepo.size,
        stargazers_count: mockRepo.stargazers_count,
        watchers_count: mockRepo.watchers_count,
        language: mockRepo.language,
        has_issues: mockRepo.has_issues,
        has_projects: mockRepo.has_projects,
        has_downloads: mockRepo.has_downloads,
        has_wiki: mockRepo.has_wiki,
        has_pages: mockRepo.has_pages,
        has_discussions: mockRepo.has_discussions,
        forks_count: mockRepo.forks_count,
        archived: mockRepo.archived,
        disabled: mockRepo.disabled,
        license: mockRepo.license,
        default_branch: mockRepo.default_branch,
        topics: mockRepo.topics,
        visibility: mockRepo.visibility,
        open_issues_count: mockRepo.open_issues_count,
        network_count: mockRepo.network_count,
        subscribers_count: mockRepo.subscribers_count
      };
    }
    return this.repositoryService.getRepositoryDetails(owner, repo);
  }

  async getRepositoryFiles(
    owner: string,
    repo: string,
    ref?: string,
    maxFiles: number = 1000,
    path?: string
  ): Promise<GitHubFilesResponse> {
    if (this.isDevMode()) {
      const files = await devGitHubService.getRepoFiles(owner, repo, path);
      const result = {
        files,
        totalFiles: files.length,
        owner,
        repo,
        ref: ref || 'main'
      };
      return result;
    }
    return this.repositoryService.getRepositoryFiles(owner, repo, ref, maxFiles, path);
  }

  async getBranches(owner: string, repo: string): Promise<string[]> {
    if (this.isDevMode()) {
      const branches = await devGitHubService.getRepoBranches(owner, repo);
      return branches.map(branch => branch.name);
    }
    return this.repositoryService.getBranches(owner, repo);
  }

  // User operations
  async getUserRepositories(username?: string): Promise<RepoSummary[]> {
    if (this.isDevMode()) {
      return devGitHubService.getUserRepos(username || 'lantos1618');
    }
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

  // Dev-specific service creation that bypasses real API calls
  static createDev(): GitHubService {
    // Create a dummy Octokit instance for dev mode
    const dummyOctokit = new Octokit();
    return new GitHubService(dummyOctokit);
  }
}

// Convenience functions for backward compatibility
export function createPublicGitHubService(): GitHubService {
  // Check if we're in dev mode
  if (process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true') {
    return GitHubService.createDev();
  }
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
  // Check if we're in dev mode
  if (process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true') {
    return GitHubService.createDev();
  }

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
  // Check if we're in dev mode
  if (process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true') {
    return GitHubService.createDev();
  }

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