export interface RepoFile {
  path: string;
  content: string;
}

export interface RepoParams {
  user: string;
  repo: string;
  ref?: string;
  path?: string;
} 