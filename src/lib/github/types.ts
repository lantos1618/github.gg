// GitHub API response types
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
  private: boolean;
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
  fork?: boolean;
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
  commitSha: string;
}

// Authentication types
export type BetterAuthSession = Awaited<ReturnType<typeof import('@/lib/auth').auth.api.getSession>>;
export type FlexibleOctokit = import('@octokit/rest').Octokit;

// Service configuration
export const DEFAULT_MAX_FILES = 5000;

export interface GitHubFile {
  path: string;
  type: 'file' | 'dir';
  size: number;
  content: string;
} 