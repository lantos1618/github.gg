export const DEFAULT_MAX_FILES = 300;

export interface GitHubFile {
  path: string;
  content: string;
}

export interface GitHubFilesResponse {
  files: GitHubFile[];
  totalFiles: number;
  owner: string;
  repo: string;
  ref: string;
}

export interface RepositoryInfo {
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
} 