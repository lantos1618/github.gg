import { Octokit } from '@octokit/rest';
import { extractTarball } from './extractor';
import { RepoCache } from './cache';
import type { RepositoryInfo, RepoSummary, GitHubFilesResponse, BetterAuthSession, GitHubFile } from './types';
import { getBestOctokitForRepo } from './app';
import { parseError, isApiError } from '@/lib/types/errors';
import { Readable } from 'stream';

// GitHub API response types
interface GitHubRepoData {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  html_url: string;
  default_branch: string;
  updated_at: string;
  owner: {
    login: string;
  };
}

interface GitHubBranchData {
  name: string;
}

// Repository-specific operations
export class RepositoryService {
  private octokit: Octokit;
  private cache: RepoCache;

  constructor(octokit: Octokit) {
    this.octokit = octokit;
    this.cache = new RepoCache();
  }

  // Get repository data with caching
  private async getRepoData(owner: string, repo: string): Promise<GitHubRepoData> {
    const cacheKey = `${owner}/${repo}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as GitHubRepoData;
    }

    try {
      const { data } = await this.octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      });
      
      this.cache.set(cacheKey, data);
      return data as GitHubRepoData;
    } catch (error: unknown) {
      // Check if it's a 404 error and provide a user-friendly message
      if (isApiError(error) && error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
      }
      const errorMessage = parseError(error);
      throw new Error(`Failed to get repository: ${errorMessage}`);
    }
  }

  // Validate repository access
  async validateRepoAccess(owner: string, repo: string): Promise<void> {
    try {
      await this.getRepoData(owner, repo);
    } catch (error) {
      throw error;
    }
  }

  // Get default branch
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const repoData = await this.getRepoData(owner, repo);
    return repoData.default_branch;
  }

  // Get tarball data directly (no double download!)
  async getTarballData(owner: string, repo: string, ref: string): Promise<ArrayBuffer> {
    console.log("tarball getTarballData", { owner, repo, ref });

    console.log(`test url https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`);
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/tarball/{ref}', {
        owner,
        repo,
        ref,
      });
      console.log("tarball getTarballData", { url: response.url, size: (response.data as ArrayBuffer).byteLength, data: (response.data as ArrayBuffer).slice(0, 100) });
      return response.data as ArrayBuffer;
    } catch (error: unknown) {
      const errorMessage = parseError(error);
      throw new Error(`Failed to get tarball: ${errorMessage}`);
    }
  }

  // Get repository info
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
      throw error;
    }
  }

  // Get repository details
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
      throw error;
    }
  }

  // Get repository files
  async getRepositoryFiles(
    owner: string,
    repo: string,
    ref?: string,
    maxFiles: number = 1000,
    path?: string
  ): Promise<GitHubFilesResponse> {
    try {
      // Validate repository access (this will cache the repo data)
      await this.validateRepoAccess(owner, repo);

      // Get the target ref (default branch if not provided)
      const targetRef = ref || await this.getDefaultBranch(owner, repo);

      // Get tarball data directly (no double download!)
      const tarballData = await this.getTarballData(owner, repo, targetRef);

      // Convert ArrayBuffer to Node.js ReadableStream
      const stream = Readable.from(Buffer.from(tarballData));

      const files: GitHubFile[] = [];
      await extractTarball(stream, (file) => {
        if (files.length < maxFiles) {
          files.push(file);
        }
      }, path);
      
      // Transform the files to match the expected type structure
      const transformedFiles = files.map(file => ({
        name: file.path.split('/').pop() || file.path,
        path: file.path,
        size: file.size,
        type: file.type === 'dir' ? 'directory' as const : 'file' as const,
        content: file.content
      }));
      
      return {
        files: transformedFiles,
        totalFiles: transformedFiles.length,
        owner,
        repo,
        ref: targetRef,
      };
    } catch (error: unknown) {
      const errorMessage = parseError(error);
      throw new Error(`Failed to get repository files: ${errorMessage}`);
    }
  }

  // Get branches
  async getBranches(owner: string, repo: string): Promise<string[]> {
    try {
      const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/branches', { 
        owner, 
        repo, 
        per_page: 100 
      });
      return (data as GitHubBranchData[]).map((branch) => branch.name);
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string };
      if (e.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found`);
      }
      console.error(`Failed to get branches for ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch branches from GitHub.`);
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }

  // Static factory method for repository-specific service
  static async createForRepo(owner: string, repo: string, session?: BetterAuthSession, req?: Request): Promise<RepositoryService> {
    try {
      // Convert BetterAuthSession to SessionData if needed
      const sessionData = session ? {
        user: session.user,
        accessToken: undefined, // BetterAuthSession doesn't have accessToken
        refreshToken: undefined,
        expiresAt: undefined
      } : undefined;
      
      const octokit = await getBestOctokitForRepo(owner, repo, sessionData, req);
      return new RepositoryService(octokit as Octokit);
    } catch (error) {
      console.warn(`Failed to get GitHub App access for ${owner}/${repo}, falling back to OAuth:`, error);
      // Fallback to OAuth-based service
      const { GitHubAuthFactory } = await import('./auth-factory');
      const octokit = GitHubAuthFactory.createPublic();
      return new RepositoryService(octokit);
    }
  }
} 