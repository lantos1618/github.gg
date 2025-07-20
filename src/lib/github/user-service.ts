import { Octokit } from '@octokit/rest';
import type { RepoSummary } from './types';
import { parseError } from '@/lib/types/errors';

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
  private?: boolean;
}

// User-specific operations
export class UserService {
  private octokit: Octokit;

  constructor(octokit: Octokit) {
    this.octokit = octokit;
  }

  // Get user repositories with pagination to fetch ALL repositories
  async getUserRepositories(username?: string): Promise<RepoSummary[]> {
    try {
      const allRepos: GitHubUserRepoData[] = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      console.log(`🔍 Fetching repositories for ${username || 'authenticated user'}...`);

      while (hasMore) {
        const endpoint = username
          ? this.octokit.request('GET /users/{username}/repos', { 
              username, 
              per_page: perPage, 
              page, 
              sort: 'updated'
            })
          : this.octokit.request('GET /user/repos', { 
              affiliation: 'owner,collaborator,organization_member', 
              per_page: perPage, 
              page, 
              sort: 'updated',
            });

        const { data } = await endpoint;
        // Only keep public repos
        const repos = (data as GitHubUserRepoData[]).filter(r => !r.private);
        
        console.log(`📦 Fetched page ${page}: ${repos.length} public repositories`);
        
        allRepos.push(...repos);
        
        if (repos.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
        if (page > 10) {
          console.warn('⚠️ Reached maximum page limit (10), stopping pagination');
          hasMore = false;
        }
      }

      console.log(`✅ Total public repositories fetched: ${allRepos.length}`);

      return allRepos.map((repo) => ({
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
      console.error('❌ Error fetching repositories:', errorMessage);
      if (errorMessage.includes('401')) {
         throw new Error(`Authentication error: Bad credentials or token expired. Please sign out and sign back in. Original error: ${errorMessage}`);
      }
      if (errorMessage.includes('403')) {
         throw new Error(`Permission error: Your GitHub token doesn't have the required scopes. Please check your GitHub App installation or OAuth permissions. Original error: ${errorMessage}`);
      }
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