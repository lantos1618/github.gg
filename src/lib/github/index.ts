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
      const mockRepo = await devGitHubService.getRepo(owner, repo) as {
        name: string;
        description: string | null;
        stargazers_count?: number;
        forks_count?: number;
        language: string | null;
        topics?: string[];
        default_branch?: string;
        updated_at: string;
        private: boolean;
      };
      return {
        name: mockRepo.name,
        description: mockRepo.description,
        stargazersCount: mockRepo.stargazers_count || 0,
        forksCount: mockRepo.forks_count || 0,
        language: mockRepo.language,
        topics: mockRepo.topics || [],
        url: `https://github.com/${owner}/${repo}`,
        defaultBranch: mockRepo.default_branch || 'main',
        updatedAt: mockRepo.updated_at,
        private: mockRepo.private
      };
    }
    return this.repositoryService.getRepositoryInfo(owner, repo);
  }

  async getRepositoryDetails(owner: string, repo: string): Promise<RepoSummary> {
    if (this.isDevMode()) {
      const mockRepo = await devGitHubService.getRepo(owner, repo) as {
        name: string;
        description: string | null;
        stargazers_count?: number;
        forks_count?: number;
        language: string | null;
        topics?: string[];
        fork?: boolean;
      };
      return {
        owner,
        name: mockRepo.name,
        description: mockRepo.description || undefined,
        stargazersCount: mockRepo.stargazers_count || 0,
        forksCount: mockRepo.forks_count || 0,
        language: mockRepo.language || undefined,
        topics: mockRepo.topics || [],
        url: `https://github.com/${owner}/${repo}`,
        fork: mockRepo.fork
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
      const branches = await devGitHubService.getRepoBranches(owner, repo) as Array<{ name: string }>;
      return branches.map(branch => branch.name);
    }
    return this.repositoryService.getBranches(owner, repo);
  }

  // User operations
  async getUserRepositories(username?: string, limit?: number): Promise<RepoSummary[]> {
    if (this.isDevMode()) {
      const mockRepos = await devGitHubService.getUserRepos(username || 'dev') as Array<{
        owner?: { login?: string };
        name: string;
        description: string | null;
        stargazers_count?: number;
        forks_count?: number;
        language: string | null;
        topics?: string[];
        fork?: boolean;
      }>;
      return mockRepos.map(mockRepo => ({
        owner: mockRepo.owner?.login || 'dev',
        name: mockRepo.name,
        description: mockRepo.description || undefined,
        stargazersCount: mockRepo.stargazers_count || 0,
        forksCount: mockRepo.forks_count || 0,
        language: mockRepo.language || undefined,
        topics: mockRepo.topics || [],
        url: `https://github.com/${mockRepo.owner?.login || 'dev'}/${mockRepo.name}`,
        fork: mockRepo.fork
      }));
    }
    return this.userService.getUserRepositories(username, limit);
  }

  async hasStarredRepo(owner: string, repo: string): Promise<boolean> {
    if (this.isDevMode()) {
      // In dev mode, always return true for github.gg repo
      return owner === 'lantos1618' && repo === 'github.gg';
    }
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