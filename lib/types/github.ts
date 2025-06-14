// GitHub API related types

/**
 * Base interface for all repository items
 */
export interface RepoItemBase {
  path: string;
  name: string;
  size: number;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  sha?: string;
}

/**
 * Represents a file in a GitHub repository
 */
export interface RepoFile extends RepoItemBase {
  type: 'file';
  content?: string;
  encoding?: string;
  tooLarge?: boolean;
}

/**
 * Represents a directory in a GitHub repository
 */
export interface RepoDirectory extends RepoItemBase {
  type: 'dir';
}

/**
 * Represents a symbolic link in a GitHub repository
 */
export interface RepoSymlink extends RepoItemBase {
  type: 'symlink';
  target?: string;
}

/**
 * Represents a submodule in a GitHub repository
 */
export interface RepoSubmodule extends RepoItemBase {
  type: 'submodule';
  url?: string;
}

/**
 * Union type of all possible repository item types
 */
export type RepoItem = RepoFile | RepoDirectory | RepoSymlink | RepoSubmodule;

/**
 * File processing options for repository content
 */
export interface FileProcessingOptions {
  maxFileSize?: number;
  maxFiles?: number;
  includeExtensions?: string[];
  excludePaths?: string[];
  includeContent?: boolean;
}

/**
 * GitHub repository issue
 */
export interface Issue {
  id: number;
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  body: string | null;
  html_url: string;
  comments: number;
  labels: Array<{
    id: number;
    name: string;
    color: string;
    description: string | null;
  }>;
}

/**
 * GitHub commit data structure
 */
export interface CommitData {
  sha: string;
  node_id: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
    verification?: {
      verified: boolean;
      reason: string;
      signature: string | null;
      payload: string | null;
    };
  };
  url: string;
  html_url: string;
  comments_url: string;
  author: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  } | null;
  committer: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  } | null;
  parents: Array<{
    sha: string;
    url: string;
    html_url: string;
  }>;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    sha: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    blob_url: string;
    raw_url: string;
    contents_url: string;
    patch?: string;
  }>;
}

/**
 * File content result from GitHub API
 */
export interface FileContentResult {
  name: string;
  path: string;
  size: number;
  content: string;
  isBinary: boolean;
}

/**
 * Search result for GitHub repositories
 */
export interface SearchRepositoryResult {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
}

/**
 * Search response for repositories
 */
export interface SearchRepositoriesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchRepositoryResult[];
}
