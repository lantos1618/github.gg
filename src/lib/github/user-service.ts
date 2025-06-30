import { Octokit } from '@octokit/rest';
import type { RepoSummary } from './types';
import { parseError } from '../types/errors';
import { db } from '@/db';
import { account, installationRepositories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
  async getUserRepositories(username?: string, userId?: string): Promise<RepoSummary[]> {
    // Try GitHub App installation method first if userId is provided
    if (userId) {
      try {
        // Find installationId for this user
        const userAccount = await db.query.account.findFirst({
          where: and(
            eq(account.userId, userId),
            eq(account.providerId, 'github')
          ),
        });
        const installationId = userAccount?.installationId;
        if (installationId) {
          // Query installationRepositories for this installation
          const repos = await db.query.installationRepositories.findMany({
            where: eq(installationRepositories.installationId, installationId),
          });
          if (repos.length > 0) {
            // Map to RepoSummary
            return repos.map(r => {
              const [owner, name] = r.fullName.split('/');
              return {
                owner,
                name,
                description: '',
                stargazersCount: 0,
                forksCount: 0,
                language: '',
                topics: [],
                url: `https://github.com/${owner}/${name}`,
              };
            });
          }
        }
      } catch (e) {
        // Log and fallback
        console.warn('Failed to fetch installation repositories, falling back to OAuth:', e);
      }
    }
    // Fallback to old OAuth method
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
      const errorMessage = parseError(error);
      throw new Error(`Failed to get user repositories: ${errorMessage}`);
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