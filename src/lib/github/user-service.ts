import { Octokit } from '@octokit/rest';
import type { RepoSummary } from './types';

// GitHub API response types
interface GitHubUserRepoData {
  owner: {
    login: string;
  };
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  html_url: string;
}

// User-specific operations
export class UserService {
  private octokit: Octokit;

  constructor(octokit: Octokit) {
    this.octokit = octokit;
  }

  // Get user repositories
  async getUserRepositories(username?: string): Promise<RepoSummary[]> {
    try {
      // If no username provided, get authenticated user's repos
      const endpoint = username 
        ? this.octokit.request('GET /users/{username}/repos', { username, per_page: 100, sort: 'updated' })
        : this.octokit.request('GET /user/repos', { per_page: 100, sort: 'updated' });

      const { data } = await endpoint;
      
      return (data as GitHubUserRepoData[]).map((repo) => ({
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

  // Get popular repositories (trending)
  async getPopularRepositories(): Promise<RepoSummary[]> {
    try {
      // This would typically use a different endpoint or service
      // For now, we'll return an empty array as this might need external data
      return [];
    } catch (error: unknown) {
      console.error('Failed to get popular repositories:', error);
      throw new Error('Failed to fetch popular repositories.');
    }
  }
} 