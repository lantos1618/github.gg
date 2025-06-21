import { Octokit } from '@octokit/rest';
import { auth } from '../auth';
import { env } from '../env';
import { GitHubFilesResponse, RepositoryInfo, DEFAULT_MAX_FILES, RepoSummary } from './types';
import { extractTarball } from './extractor';
import { POPULAR_REPOS } from '../constants';

export { DEFAULT_MAX_FILES } from './types';
export type { GitHubFile, GitHubFilesResponse, RepositoryInfo, RepoSummary } from './types';

export class GitHubService {
  private octokit: Octokit;

  constructor(token?: string) {
    const authToken = token || env.GITHUB_PUBLIC_API_KEY;
    
    if (!authToken) {
      throw new Error('No GitHub token available');
    }

    // Validate token format
    if (!authToken.startsWith('ghp_') && !authToken.startsWith('gho_') && !authToken.startsWith('ghu_')) {
      console.warn('GitHub token format appears invalid. Expected format: ghp_xxxxxxxxxxxxxxxxxxxx');
    }

    this.octokit = new Octokit({
      auth: authToken,
    });
  }

  async getRepositoryInfo(owner: string, repo: string): Promise<RepositoryInfo> {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });
      return {
        stargazers_count: data.stargazers_count,
        forks_count: data.forks_count,
        watchers_count: data.watchers_count,
      };
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string };
      if (e.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found`);
      }
      console.error(`Failed to get repository info for ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch repository data from GitHub.`);
    }
  }

  async getRepositoryDetails(owner: string, repo: string): Promise<RepoSummary> {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });
      
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
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string };
      if (e.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found`);
      }
      console.error(`Failed to get repository details for ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch repository details from GitHub.`);
    }
  }

  async getUserRepositories(username?: string): Promise<RepoSummary[]> {
    try {
      // If no username provided, get authenticated user's repos
      const endpoint = username 
        ? this.octokit.repos.listForUser({ username, per_page: 100, sort: 'updated' })
        : this.octokit.repos.listForAuthenticatedUser({ per_page: 100, sort: 'updated' });

      const { data } = await endpoint;
      
      return data.map(repo => ({
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
      // First, test the token by making a simple API call
      try {
        await this.octokit.rest.users.getAuthenticated();
      } catch (authError: unknown) {
        const error = authError as { status?: number; message?: string };
        if (error.status === 401) {
          throw new Error('GitHub token is invalid or expired. Please check your GITHUB_PUBLIC_API_KEY environment variable.');
        }
        throw new Error(`GitHub authentication failed: ${error.message}`);
      }

      // If no ref provided, get the default branch
      let targetRef = ref;
      if (!targetRef) {
        try {
          const repoInfo = await this.octokit.repos.get({
            owner,
            repo,
          });
          targetRef = repoInfo.data.default_branch;
        } catch (repoError: unknown) {
          const error = repoError as { status?: number; message?: string };
          if (error.status === 404) {
            throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
          }
          throw new Error(`Failed to get repository info: ${error.message}`);
        }
      }

      // Get tarball URL
      let response;
      try {
        response = await this.octokit.repos.downloadTarballArchive({
          owner,
          repo,
          ref: targetRef,
        });
      } catch (tarballError: unknown) {
        const error = tarballError as { status?: number; message?: string };
        if (error.status === 404) {
          throw new Error(`Branch or tag '${targetRef}' not found in repository ${owner}/${repo}`);
        }
        throw new Error(`Failed to get tarball: ${error.message}`);
      }

      // The response contains a redirect URL, not the actual data
      const tarballUrl = response.url;

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
}

// Factory function to create GitHub service with session
export async function createGitHubService(session: unknown, req?: Request): Promise<GitHubService> {
  try {
    // Use Better Auth's getAccessToken method to get fresh token
    if (session && typeof session === 'object' && 'user' in session && 
        session.user && typeof session.user === 'object' && 'id' in session.user && req) {
      const { accessToken } = await auth.api.getAccessToken({
        body: {
          providerId: 'github',
          userId: session.user.id as string,
        },
        headers: req.headers,
      });
      
      if (accessToken) {
        return new GitHubService(accessToken);
      }
    }
    
    // Fallback to public API key
    return new GitHubService(env.GITHUB_PUBLIC_API_KEY);
  } catch {
    console.warn('Failed to get GitHub access token, falling back to public API');
    return new GitHubService(env.GITHUB_PUBLIC_API_KEY);
  }
} 