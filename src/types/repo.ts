export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

export interface RepoParams {
  user: string;
  repo: string;
  ref?: string;
  path?: string;
} 