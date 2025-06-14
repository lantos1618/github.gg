/**
 * Repository data structure from GitHub API
 */
export interface RepoData {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  html_url: string;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  default_branch: string;
  open_issues_count: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  language: string | null;
}

/**
 * Props for repository commit detail component
 */
export interface RepoCommitDetailProps {
  username: string;
  reponame: string;
  sha: string;
  repoData: RepoData;
  commitData: import('./github').CommitData;
}
