// GitHub API related types

/**
 * Represents a file or directory in a GitHub repository
 */
export interface RepoFile {
  path: string;
  name: string;
  size: number;
  type: 'file' | 'dir' | 'symlink';
  content?: string;
  encoding?: string;
  tooLarge?: boolean;
}

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
