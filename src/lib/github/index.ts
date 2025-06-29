import { Octokit } from '@octokit/rest';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { extractTarball } from './extractor';
import { getInstallationToken, githubApp, getBestOctokitForRepo } from './app';

export const DEFAULT_MAX_FILES = 1000;

export interface RepositoryInfo {
  name: string;
  description: string | null;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
  topics: string[];
  url: string;
  defaultBranch: string;
  updatedAt: string;
}

export interface RepoSummary {
  owner: string;
  name: string;
  description?: string;
  stargazersCount: number;
  forksCount: number;
  language?: string;
  topics?: string[];
  url: string;
}

export interface GitHubFilesResponse {
  files: Array<{
    name: string;
    path: string;
    size: number;
    type: 'file' | 'directory';
    content?: string;
  }>;
  totalFiles: number;
  owner: string;
  repo: string;
  ref: string;
}

// Type for Better Auth session
type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

// Flexible Octokit type that can handle different instances
type FlexibleOctokit = Octokit;

export class GitHubService {
  private octokit: FlexibleOctokit;
  private repoCache = new Map<string, any>(); // Cache for repository data

  constructor(token?: string) {
    const authToken = token || env.GITHUB_PUBLIC_API_KEY;
    
    if (!authToken) {
      throw new Error('No GitHub token available');
    }

    this.octokit = new Octokit({
      auth: authToken,
    });
  }

  // Method to set Octokit instance (for GitHub App tokens)
  setOctokit(octokit: FlexibleOctokit) {
    this.octokit = octokit;
    // Clear cache when octokit changes (different auth context)
    this.clearCache();
  }

  // Method to clear the repository cache
  clearCache(): void {
    this.repoCache.clear();
  }

  // Method to get cache statistics (useful for debugging)
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.repoCache.size,
      keys: Array.from(this.repoCache.keys()),
    };
  }

  // New method to get Octokit instance for a specific repository
  static async createForRepo(owner: string, repo: string, session?: BetterAuthSession, req?: Request): Promise<GitHubService> {
    try {
      const octokit = await getBestOctokitForRepo(owner, repo, session, req);
      const service = new GitHubService();
      service.setOctokit(octokit);
      return service;
    } catch (error) {
      console.warn(`Failed to get GitHub App access for ${owner}/${repo}, falling back to OAuth:`, error);
      // Fallback to OAuth-based service
      return new GitHubService();
    }
  }

  // Private method to get repository data with caching
  private async getRepoData(owner: string, repo: string): Promise<any> {
    const cacheKey = `${owner}/${repo}`;
    
    if (this.repoCache.has(cacheKey)) {
      return this.repoCache.get(cacheKey);
    }

    try {
      const { data } = await this.octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      });
      
      this.repoCache.set(cacheKey, data);
      return data;
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string };
      if (e.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found`);
      }
      if (e.status === 401) {
        throw new Error('GitHub token is invalid or expired. Please check your GITHUB_PUBLIC_API_KEY environment variable.');
      }
      if (e.status === 403) {
        throw new Error(`Repository ${owner}/${repo} is not accessible with current permissions.`);
      }
      console.error(`Failed to get repository data for ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch repository data from GitHub.`);
    }
  }

  // Private method to validate repository access
  private async validateRepoAccess(owner: string, repo: string): Promise<void> {
    try {
      await this.getRepoData(owner, repo);
    } catch (error) {
      // Re-throw the error as it's already properly formatted
      throw error;
    }
  }

  // Private method to get default branch
  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const repoData = await this.getRepoData(owner, repo);
    return repoData.default_branch;
  }

  // Private method to get tarball URL
  private async getTarballUrl(owner: string, repo: string, ref: string): Promise<string> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/tarball/{ref}', {
        owner,
        repo,
        ref,
      });
      return response.url;
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string };
      if (e.status === 404) {
        throw new Error(`Branch or tag '${ref}' not found in repository ${owner}/${repo}`);
      }
      throw new Error(`Failed to get tarball: ${e.message}`);
    }
  }

  async getRepositoryInfo(owner: string, repo: string): Promise<RepositoryInfo> {
    try {
      const data = await this.getRepoData(owner, repo);
      return {
        name: data.name,
        description: data.description,
        stargazersCount: data.stargazers_count,
        forksCount: data.forks_count,
        language: data.language,
        topics: data.topics || [],
        url: data.html_url,
        defaultBranch: data.default_branch,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      // Error is already properly formatted by getRepoData
      throw error;
    }
  }

  async getRepositoryDetails(owner: string, repo: string): Promise<RepoSummary> {
    try {
      const data = await this.getRepoData(owner, repo);
      
      return {
        owner: data.owner.login,
        name: data.name,
        description: data.description || undefined,
        stargazersCount: data.stargazers_count,
        forksCount: data.forks_count,
        language: data.language || undefined,
        topics: data.topics || undefined,
        url: data.html_url,
      };
    } catch (error) {
      // Error is already properly formatted by getRepoData
      throw error;
    }
  }

  async getUserRepositories(username?: string): Promise<RepoSummary[]> {
    try {
      // If no username provided, get authenticated user's repos
      const endpoint = username 
        ? this.octokit.request('GET /users/{username}/repos', { username, per_page: 100, sort: 'updated' })
        : this.octokit.request('GET /user/repos', { per_page: 100, sort: 'updated' });

      const { data } = await endpoint;
      
      return data.map((repo: any) => ({
        owner: repo.owner.login,
        name: repo.name,
        description: repo.description || undefined,
        stargazersCount: repo.stargazers_count || 0,
        forksCount: repo.forks_count || 0,
        language: repo.language || undefined,
        topics: repo.topics || undefined,
        url: repo.html_url,
      }));
    } catch (error: unknown) {
      console.error('Failed to get user repositories:', error);
      throw new Error('Failed to fetch user repositories from GitHub.');
    }
  }

  async getRepositoryFiles(
    owner: string,
    repo: string,
    ref?: string,
    maxFiles: number = DEFAULT_MAX_FILES,
    path?: string
  ): Promise<GitHubFilesResponse> {
    try {
      // Validate repository access (this will cache the repo data)
      await this.validateRepoAccess(owner, repo);

      // Get the target ref (default branch if not provided)
      const targetRef = ref || await this.getDefaultBranch(owner, repo);

      // Get tarball URL
      const tarballUrl = await this.getTarballUrl(owner, repo, targetRef);

      // Download and extract tarball
      const downloadResponse = await fetch(tarballUrl);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download tarball: ${downloadResponse.status} ${downloadResponse.statusText}`);
      }

      const buffer = await downloadResponse.arrayBuffer();
      const files = await extractTarball(buffer, maxFiles, path);
      
      return {
        files,
        totalFiles: files.length,
        owner,
        repo,
        ref: targetRef,
      };
    } catch (error) {
      // Don't log here; let the caller handle logging
      throw error;
    }
  }

  async getBranches(owner: string, repo: string): Promise<string[]> {
    try {
      const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/branches', { 
        owner, 
        repo, 
        per_page: 100 
      });
      return data.map((branch: any) => branch.name);
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string };
      if (e.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found`);
      }
      console.error(`Failed to get branches for ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch branches from GitHub.`);
    }
  }
}

// Function 1: Create service with public API key (for unauthenticated users)
export function createPublicGitHubService(): GitHubService {
  console.log('🔑 Using public GitHub API key');
  return new GitHubService(env.GITHUB_PUBLIC_API_KEY);
}

// Function 2: Create service with GitHub App installation (for authenticated users with installations)
export async function createGitHubAppService(session: BetterAuthSession): Promise<GitHubService | null> {
  if (!session?.user?.id) {
    return null;
  }

  try {
    // Get the user's linked installation
    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, session.user.id),
        eq(account.providerId, 'github')
      ),
    });

    if (userAccount?.installationId) {
      console.log(`✅ Using GitHub App installation ${userAccount.installationId} for authenticated user`);
      
      // Get the installation token (like the official docs suggest)
      const { getInstallationToken } = await import('./app');
      const installationToken = await getInstallationToken(userAccount.installationId);
      
      // Create a new Octokit instance with the installation token
      const service = new GitHubService(installationToken);
      return service;
    }
  } catch (error) {
    console.warn('Failed to create GitHub App service:', error);
  }

  return null;
}

// Function 3: Create service with OAuth token (for authenticated users without installations)
export async function createOAuthGitHubService(session: BetterAuthSession, req?: Request): Promise<GitHubService | null> {
  if (!session?.user?.id || !req) {
    return null;
  }

  try {
    const { accessToken } = await auth.api.getAccessToken({
      body: {
        providerId: 'github',
        userId: session.user.id,
      },
      headers: req.headers,
    });
    
    if (accessToken) {
      console.log('🔐 Using OAuth token for authenticated user');
      return new GitHubService(accessToken);
    }
  } catch (error) {
    console.warn('Failed to get OAuth token:', error);
  }

  return null;
}

// Create GitHub service with unified authentication
export async function createGitHubService(session: unknown, req?: Request): Promise<GitHubService> {
  console.log('🔍 Creating GitHub service with session:', !!session);

  // REQUIREMENT: User must be authenticated via OAuth
  if (!session || typeof session !== 'object' || !('user' in session) || !session.user) {
    throw new Error('Authentication required. Please sign in with GitHub OAuth.');
  }

  const user = session.user as any;
  console.log(`👤 Authenticated user: ${user.name} (${user.id})`);

  // REQUIREMENT: User must have a linked GitHub App installation
  const userAccount = await db.query.account.findFirst({
    where: and(
      eq(account.userId, user.id),
      eq(account.providerId, 'github')
    ),
  });

  if (!userAccount?.installationId) {
    throw new Error('GitHub App installation required. Please install the GitHub App to use this service.');
  }

  // Verify the installation exists and is accessible
  try {
    await githubApp.octokit.request(
      'GET /app/installations/{installation_id}',
      {
        installation_id: userAccount.installationId,
      }
    );
    console.log(`✅ Using GitHub App installation ${userAccount.installationId} for authenticated user`);
  } catch (error: any) {
    console.error(`❌ Installation ${userAccount.installationId} not accessible:`, error.message);
    
    // Clear the invalid installation
    await db.update(account)
      .set({ 
        installationId: null,
        updatedAt: new Date()
      })
      .where(and(
        eq(account.userId, user.id),
        eq(account.providerId, 'github')
      ));
    
    throw new Error('GitHub App installation is invalid. Please reinstall the GitHub App.');
  }

  // Create GitHub App service with installation token
  try {
    const installationToken = await getInstallationToken(userAccount.installationId);
    return new GitHubService(installationToken);
  } catch (error: any) {
    console.error('Failed to create GitHub App service:', error);
    throw new Error('Failed to create GitHub service. Please try again.');
  }
} 