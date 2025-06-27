export const DEFAULT_MAX_FILES = 1000;

export interface GitHubFile {
  path: string;
  type: 'file' | 'dir';
  size: number;
  content: string;
}

export interface GitHubFilesResponse {
  files: GitHubFile[];
  totalFiles: number;
  owner: string;
  repo: string;
  ref?: string;
}

export interface RepositoryInfo {
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  default_branch: string;
}

export interface RepoSummary {
  owner: string;
  name: string;
  description?: string | null;
  stargazersCount: number;
  forksCount: number;
  language?: string | null;
  topics?: string[] | null;
  url?: string;
  default_branch?: string;
  starsToday?: number;
  starsThisWeek?: number;
  starsThisMonth?: number;
  special?: boolean;
} 