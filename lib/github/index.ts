import { Octokit } from "@octokit/rest";
import { minimatch } from 'minimatch';
import { getFromCache, setInCache } from './cache';
import { extractRepoTarballToMemory } from './tarball';

// Import types from the types directory
import type {
  RepoFile,
  RepoItem,
  RepoDirectory,
  RepoSymlink,
  RepoSubmodule,
  FileProcessingOptions as FileProcessingOptionsType,
  Issue,
  CommitData,
  FileContentResult,
  SearchRepositoryResult,
  SearchRepositoriesResponse
} from '@/lib/types/github';

// Re-export types for backward compatibility
export type { 
  FileProcessingOptions,
  RepoFile,
  RepoItem,
  RepoDirectory,
  RepoSymlink,
  RepoSubmodule
};

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || "";

// Default file processing options
// File processing options type is now imported from types/github
// This is just a local type for backward compatibility
type FileProcessingOptions = FileProcessingOptionsType;

/**
 * Options for searching repositories
 */
export interface SearchRepositoryOptions {
  page?: number;
  perPage?: number;
  sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
  order?: 'asc' | 'desc';
  accessToken?: string;
}

const DEFAULT_OPTIONS: Required<FileProcessingOptions> = {
  maxFileSize: 1024 * 1024, // 1MB
  maxFiles: 1000,
  includeExtensions: [],
  excludePaths: ['**/node_modules/**', '**/.git/**', '**/__MACOSX/**', '**/.*'],
  includeContent: true
}

// Custom error class for GitHub service errors
export class GitHubServiceError extends Error {
  statusCode: number
  
  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.name = 'GitHubServiceError'
    this.statusCode = statusCode
    Object.setPrototypeOf(this, GitHubServiceError.prototype)
  }
}

// Helper function to check if a file should be included based on options
function shouldIncludeFile(relativePath: string, options: FileProcessingOptions = {}): boolean {
  if (!relativePath) return false
  
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  
  // Check if file is in excluded paths
  if (mergedOptions.excludePaths?.some(pattern => 
    minimatch(relativePath, pattern, { matchBase: true })
  )) {
    return false
  }
  
  // Check file extension
  if (mergedOptions.includeExtensions && mergedOptions.includeExtensions.length > 0) {
    const ext = relativePath.split('.').pop()?.toLowerCase()
    if (!ext || !mergedOptions.includeExtensions.includes(`.${ext}`)) {
      return false
    }
  }
  
  return true
}

// Helper function to handle the GitHub API response and convert it to a buffer
async function streamToBuffer(response: Response): Promise<Buffer> {
  if (!response.body) {
    throw new Error('No response body')
  }
  
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalLength = 0
  
  while (true) {
    const { done, value } = await reader.read()
    
    if (done) {
      break
    }
    
    chunks.push(value)
    totalLength += value.length
  }
  
  // Combine all chunks into a single Uint8Array
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  
  return Buffer.from(result.buffer)
}

// Create an Octokit instance with the public token
export function createOctokit(token?: string): Octokit {
  return new Octokit({
    auth: token || PUBLIC_GITHUB_TOKEN,
    request: {
      timeout: 10000, // 10 second timeout
    },
  })
}

export async function getUserData(user: string, accessToken?: string) {
  // Validate username format to avoid unnecessary API calls
  if (!user || !isValidGitHubUsername(user)) {
    throw new Error("Invalid GitHub username format")
  }

  try {
    const octokit = createOctokit(accessToken)
    const { data } = await octokit.rest.users.getByUsername({
      username: user,
    })

    // Fetch public repos data
    const public_repos_data = await getPublicRepos(user, accessToken)

    return {
      ...data,
      public_repos_data,
    }
  } catch (error) {
    console.error("Error fetching user data:", error)
    return null
  }
}

// Helper function to validate GitHub username format
function isValidGitHubUsername(username: string): boolean {
  // GitHub usernames can only contain alphanumeric characters and hyphens
  // They cannot have multiple consecutive hyphens
  // They cannot begin or end with a hyphen
  // They can be up to 39 characters long
  const validUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/
  return validUsernameRegex.test(username)
}

async function getPublicRepos(user: string, accessToken?: string) {
  try {
    const octokit = createOctokit(accessToken)
    const { data } = await octokit.rest.repos.listForUser({
      username: user,
      type: "owner",
      sort: "updated",
      direction: "desc",
      per_page: 5,
    })
    return data
  } catch (error) {
    console.error("Error fetching public repos:", error)
    return []
  }
}

export async function getRepoData(user: string, repo: string) {
  try {
    const octokit = createOctokit()
    const { data } = await octokit.rest.repos.get({
      owner: user,
      repo: repo,
    })
    return data
  } catch (error) {
    console.error("Error fetching repo data:", error)
    throw error
  }
}

// Issue type is imported from '@/lib/types/github'

export async function getRepoIssues(
  owner: string,
  repo: string,
  options: { 
    page?: number; 
    state?: 'open' | 'closed' | 'all';
    perPage?: number;
  } = {}
): Promise<Issue[]> {
  const { 
    page = 1, 
    state = 'open',
    perPage = 10 
  } = options;

  const octokit = createOctokit();

  try {
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state,
      page,
      per_page: perPage,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    // Type assertion to ensure we're returning the correct type
    return data as unknown as Issue[];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching repository issues:', error.message);
    } else {
      console.error('An unknown error occurred while fetching repository issues');
    }
    // Return empty array on error to maintain backward compatibility
    return [];
  }
}

export async function getAllRepoFilesWithTar(
  user: string,
  repo: string,
  branch?: string,
  accessToken?: string,
  options: FileProcessingOptions = {}
): Promise<{
  files: Array<{
    path: string;
    name: string;
    size: number;
    type: 'file';
    content?: string;
    encoding?: string;
    tooLarge?: boolean;
  }>;
  branch: string;
}> {
  // Use the tarball utility to fetch and extract files in memory
  return await extractRepoTarballToMemory({
    owner: user,
    repo,
    ref: branch,
    token: accessToken,
    options
  });
}

export interface CommitListOptions {
  path?: string;
  sha?: string;
  page?: number;
  perPage?: number;
  since?: string;
  until?: string;
  accessToken?: string; // For authenticated requests
}

export interface CommitListResponse {
  commits: CommitData[];
  totalPages: number;
  currentPage: number;
  perPage: number;
  totalCommits: number;
}

export async function getCommitData(
  owner: string,
  repo: string,
  options: CommitListOptions = {}
): Promise<CommitListResponse> {
  const {
    path,
    sha = 'HEAD',
    page = 1,
    perPage = 30,
    since,
    until
  } = options;

  const octokit = createOctokit();
  
  try {
    const params: any = {
      owner,
      repo,
      sha,
      page,
      per_page: perPage,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    if (path) params.path = path;
    if (since) params.since = since;
    if (until) params.until = until;

    const { data, headers } = await octokit.rest.repos.listCommits(params);
    
    // Extract pagination info from headers
    const linkHeader = headers.link || '';
    let totalPages = 1;
    
    // Parse Link header to get total pages if available
    const lastPageMatch = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    if (lastPageMatch && lastPageMatch[1]) {
      totalPages = parseInt(lastPageMatch[1], 10);
    } else if (data.length > 0 && data.length < perPage) {
      // If we got fewer items than requested, this is the last page
      totalPages = page;
    }
    
    // Ensure totalCommits is a number
    const totalCountHeader = headers['x-total-count'];
    const totalCount = typeof totalCountHeader === 'string' 
      ? parseInt(totalCountHeader, 10) 
      : 0;
      
    // Transform the GitHub API response to match our CommitData type
    const transformedCommits = data.map(commit => {
      // Ensure required commit fields are present
      const commitData = commit.commit;
      const author = commitData.author || { name: 'unknown', email: 'unknown', date: new Date().toISOString() };
      const committer = commitData.committer || { name: 'unknown', email: 'unknown', date: new Date().toISOString() };
      
      // Ensure commit tree is present
      const tree = commitData.tree ? {
        sha: commitData.tree.sha || '',
        url: commitData.tree.url || ''
      } : { sha: '', url: '' };

      return {
        ...commit,
        commit: {
          ...commitData,
          author: {
            name: author.name || 'unknown',
            email: author.email || 'unknown',
            date: author.date || new Date().toISOString()
          },
          committer: {
            name: committer.name || 'unknown',
            email: committer.email || 'unknown',
            date: committer.date || new Date().toISOString()
          },
          tree,
          url: commitData.url || '',
          message: commitData.message || '',
          comment_count: commitData.comment_count || 0,
          verification: commitData.verification || {
            verified: false,
            reason: 'unsigned',
            signature: null,
            payload: null
          }
        },
        author: commit.author ? {
          login: commit.author.login || '',
          id: commit.author.id || 0,
          avatar_url: commit.author.avatar_url || '',
          html_url: commit.author.html_url || ''
        } : null,
        committer: commit.committer ? {
          login: commit.committer.login || '',
          id: commit.committer.id || 0,
          avatar_url: commit.committer.avatar_url || '',
          html_url: commit.committer.html_url || ''
        } : null,
        parents: (commit.parents || []).map(p => ({
          sha: p.sha || '',
          url: p.url || '',
          html_url: p.html_url || ''
        })),
        stats: commit.stats ? {
          additions: commit.stats.additions || 0,
          deletions: commit.stats.deletions || 0,
          total: commit.stats.total || 0
        } : undefined
      };
    });
      
    return {
      commits: transformedCommits,
      totalPages,
      currentPage: page,
      perPage,
      totalCommits: totalCount || (totalPages * perPage)
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error fetching commits for ${owner}/${repo}:`, error.message);
      throw new GitHubServiceError(
        `Failed to fetch commits: ${error.message}`,
        'status' in error ? (error as any).status : 500
      );
    }
    throw new GitHubServiceError('An unknown error occurred while fetching commits', 500);
  }
}

export async function getCompareData(user: string, repo: string, base: string, head: string) {
  try {
    const octokit = createOctokit()
    const { data } = await octokit.rest.repos.compareCommits({
      owner: user,
      repo: repo,
      base: base,
      head: head,
    })
    return data
  } catch (error) {
    console.error("Error fetching compare data:", error)
    throw error
  }
}

export async function getFileTreeData(user: string, repo: string, branch: string, path: string) {
  try {
    const octokit = createOctokit()
    const { data } = await octokit.rest.git.getTree({
      owner: user,
      repo: repo,
      tree_sha: branch,
      recursive: "false",
    })

    const treeData = data.tree.map((item) => ({
      path: path ? `${path}/${item.path}` : item.path,
      name: item.path,
      type: item.type,
    }))

    return treeData
  } catch (error) {
    console.error("Error fetching file tree data:", error)
    return []
  }
}

// FileContentResult type is imported from '@/lib/types/github'

export async function getFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  accessToken?: string
): Promise<FileContentResult> {
  const octokit = createOctokit(accessToken);
  
  // First, try to get from cache
  const cachedFile = getFromCache(owner, repo, path, branch);
  if (cachedFile) {
    return {
      name: path.split('/').pop() || path,
      path,
      size: cachedFile.size,
      content: cachedFile.content,
      isBinary: cachedFile.isBinary
    };
  }

  // If not in cache, try to fetch the tarball first
  try {
    // First, get the file metadata to check if it exists and get its size
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // Handle directory response
    if (Array.isArray(fileData)) {
      throw new GitHubServiceError('Expected a file, but got a directory', 400);
    }

    // Handle non-file responses
    if (fileData.type !== 'file') {
      throw new GitHubServiceError('Expected a file, but got a different type', 400);
    }

    // Base response data
    const baseResponse = {
      name: fileData.name,
      path: fileData.path,
      size: fileData.size,
      content: '',
      isBinary: false
    };

    // For files larger than 1MB, use the individual API to avoid downloading large tarballs
    if (fileData.size > 1 * 1024 * 1024) {
      console.warn(`File ${path} is large (${fileData.size} bytes), using direct API`);
      return await fetchFileViaApi(octokit, owner, repo, branch, path, baseResponse);
    }

    // Try to get the file from the tarball
    try {
      // Fetch the tarball for the entire repo
      const repoFiles = await getAllRepoFilesWithTar(owner, repo, branch, accessToken, {
        maxFiles: 1000, // Reasonable limit for most repos
        includeContent: true,
        includeExtensions: ['.*'], // Include all extensions
        excludePaths: [] // Don't exclude any paths
      });

      // Look for our file in the tarball results
      const fileFromTarball = repoFiles.files.find(f => f.path === path);
      
      if (fileFromTarball && fileFromTarball.content !== undefined) {
        // Cache the file content for future use
        setInCache(owner, repo, branch, [{
          path,
          content: fileFromTarball.content,
          encoding: fileFromTarball.encoding === 'base64' ? 'base64' : 'utf-8',
          size: fileFromTarball.size,
          isBinary: fileFromTarball.encoding === 'base64'
        }]);

        return {
          name: fileFromTarball.name,
          path: fileFromTarball.path,
          size: fileFromTarball.size,
          content: fileFromTarball.content,
          isBinary: fileFromTarball.encoding === 'base64'
        };
      }
    } catch (tarballError) {
      console.warn(`Failed to get file ${path} from tarball, falling back to direct API:`, tarballError);
    }

    // Fall back to direct API if tarball approach fails
    return await fetchFileViaApi(octokit, owner, repo, branch, path, baseResponse);
  } catch (error: unknown) {
    if (error instanceof Error) {
      const githubError = error as { response?: { data?: { message?: string } }, status?: number };
      throw new GitHubServiceError(
        githubError.response?.data?.message || error.message || 'Failed to fetch file content',
        githubError.status || 500
      );
    }
    throw new GitHubServiceError('An unknown error occurred while fetching file content', 500);
  }
}

/**
 * Helper function to fetch a single file via GitHub API
 * This is used as a fallback when the tarball approach fails
 */
async function fetchFileViaApi(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  baseResponse: { name: string; path: string; size: number; content: string; isBinary: boolean }
): Promise<FileContentResult> {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: branch,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (Array.isArray(data) || data.type !== 'file') {
    throw new GitHubServiceError('Expected a file', 400);
  }

  try {
    // Decode content from base64
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    
    // Check for binary content
    const isBinary = content.includes('\0') || 
                    countNonPrintableChars(content) / content.length > 0.1;

    const result = {
      ...baseResponse,
      content: isBinary ? 'Binary file not shown' : content,
      isBinary
    };

    // Cache the result
    setInCache(owner, repo, branch, [{
      path,
      content: result.content,
      encoding: isBinary ? 'base64' : 'utf-8',
      size: baseResponse.size,
      isBinary
    }]);

    return result;
  } catch (decodeError) {
    console.warn(`Failed to decode ${path} as text:`, decodeError);
    const result = {
      ...baseResponse,
      content: 'Binary file not shown',
      isBinary: true
    };

    // Cache the result even if it's binary
    setInCache(owner, repo, branch, [{
      path,
      content: result.content,
      encoding: 'base64',
      size: baseResponse.size,
      isBinary: true
    }]);

    return result;
  }
}

export async function getIssueData(
  owner: string,
  repo: string,
  issueNumber: string,
): Promise<Issue> {
  const octokit = createOctokit();
  
  try {
    const { data } = await octokit.issues.get({
      owner,
      repo,
      issue_number: Number(issueNumber),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      user: {
        login: data.user?.login || '',
        avatar_url: data.user?.avatar_url || '',
        html_url: data.user?.html_url || `https://github.com/${data.user?.login}`,
      },
      state: data.state as 'open' | 'closed',
      created_at: data.created_at,
      updated_at: data.updated_at,
      body: data.body || null,
      html_url: data.html_url,
      comments: data.comments,
      labels: (data.labels || []).map(label => {
        // Handle both string and object labels
        if (typeof label === 'string') {
          return {
            id: 0,
            name: label,
            color: '000000',
            description: null as string | null
          };
        }
        
        // Handle object labels
        return {
          id: label.id || 0,
          name: label.name || '',
          color: label.color || '000000',
          description: label.description || null
        };
      }),
    };
  } catch (error: unknown) {
    console.error(`Error fetching issue #${issueNumber} from ${owner}/${repo}:`, error);
    const statusCode = (error as { status?: number })?.status || 500;
    throw new GitHubServiceError(
      `Failed to fetch issue #${issueNumber}`,
      statusCode
    );
  }
}

// Helper function to count non-printable characters in a string
function countNonPrintableChars(str: string): number {
  return str.split('').filter(char => char.charCodeAt(0) < 32 && char.charCodeAt(0) !== 9 && char.charCodeAt(0) !== 10 && char.charCodeAt(0) !== 13).length;
}

export async function fetchRepoData(owner: string, repo: string) {
  const octokit = createOctokit();
  
  try {
    const { data } = await octokit.repos.get({
      owner,
      repo,
    });
    
    return {
      stargazers_count: data.stargazers_count || 0,
      forks_count: data.forks_count || 0,
      open_issues_count: data.open_issues_count || 0,
      description: data.description || '',
      language: data.language || '',
      html_url: data.html_url || `https://github.com/${owner}/${repo}`,
      // Add other fields as needed
    };
  } catch (error) {
    console.error('Error fetching repo data:', error);
    throw new Error('Failed to fetch repository data');
  }
}

/**
 * Search GitHub repositories
 */
export async function searchRepositories(
  query: string,
  options: SearchRepositoryOptions = {}
): Promise<SearchRepositoriesResponse> {
  const {
    page = 1,
    perPage = 10,
    sort = 'stars',
    order = 'desc',
    accessToken
  } = options;

  const octokit = createOctokit(accessToken);

  try {
    const { data } = await octokit.search.repos({
      q: query,
      sort,
      order,
      per_page: perPage,
      page,
    });

    return {
      total_count: data.total_count,
      incomplete_results: data.incomplete_results,
      items: data.items as unknown as SearchRepositoryResult[],
    };
  } catch (error: any) {
    console.error('GitHub search error:', error);
    throw new GitHubServiceError(
      error.response?.data?.message || 'Failed to search repositories',
      error.status || 500
    );
  }
}

// New functions for workflows, pull requests, and events

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: 'active' | 'deleted' | 'disabled_fork' | 'disabled_inactivity' | 'disabled_manually';
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  badge_url: string;
  deleted_at?: string;
}

export interface WorkflowRun {
  id: number;
  name?: string | null;
  head_branch: string | null;
  head_sha: string;
  run_number: number;
  event: string;
  status: any;
  conclusion: any;
  workflow_id: number;
  check_suite_id: number;
  check_suite_node_id: string;
  url: string;
  html_url: string;
  pull_requests: any[];
  created_at: string;
  updated_at: string;
  actor: any;
  run_attempt: number;
  run_started_at: string;
  triggering_actor: any;
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  previous_attempt_url: string | null;
  workflow_url: string;
  head_commit: any;
  repository: any;
  head_repository: any;
}

export interface PullRequest {
  url: string;
  id: number;
  node_id: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  issue_url: string;
  commits_url: string;
  review_comments_url: string;
  review_comment_url: string;
  comments_url: string;
  statuses_url: string;
  number: number;
  state: 'open' | 'closed';
  locked: boolean;
  title: string;
  user: any;
  body: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merge_commit_sha: string | null;
  assignee: any | null;
  assignees: any[];
  requested_reviewers: any[];
  requested_teams: any[];
  labels: any[];
  milestone: any | null;
  draft?: boolean;
  head: any;
  base: any;
  _links: any;
  author_association: string;
  auto_merge: any | null;
  active_lock_reason: string | null;
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  merged_by: any | null;
  comments: number;
  review_comments: number;
  maintainer_can_modify: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface RepositoryEvent {
  id: string;
  type: string | null;
  actor: {
    id: number;
    login: string;
    display_login?: string;
    gravatar_id: string | null;
    url: string;
    avatar_url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: any;
  public: boolean;
  created_at: string | null;
  org?: {
    id: number;
    login: string;
    display_login?: string;
    gravatar_id: string | null;
    url: string;
    avatar_url: string;
  };
}

/**
 * Get repository workflows
 */
export async function getRepoWorkflows(
  owner: string,
  repo: string,
  accessToken?: string
): Promise<Workflow[]> {
  const octokit = createOctokit(accessToken);
  
  try {
    const { data } = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    
    return data.workflows;
  } catch (error: any) {
    console.error('Error fetching repository workflows:', error);
    throw new GitHubServiceError(
      error.response?.data?.message || 'Failed to fetch workflows',
      error.status || 500
    );
  }
}

/**
 * Get repository workflow runs
 */
export async function getRepoWorkflowRuns(
  owner: string,
  repo: string,
  workflowId?: number,
  options: {
    page?: number;
    perPage?: number;
    status?: 'completed' | 'action_required' | 'cancelled' | 'failure' | 'neutral' | 'skipped' | 'stale' | 'success' | 'timed_out' | 'in_progress' | 'queued' | 'requested' | 'waiting' | 'pending';
    branch?: string;
    event?: string;
    actor?: string;
  } = {}
): Promise<{ total_count: number; workflow_runs: WorkflowRun[] }> {
  const octokit = createOctokit();
  
  try {
    const params: any = {
      owner,
      repo,
      page: options.page || 1,
      per_page: options.perPage || 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    if (workflowId) params.workflow_id = workflowId;
    if (options.status) params.status = options.status;
    if (options.branch) params.branch = options.branch;
    if (options.event) params.event = options.event;
    if (options.actor) params.actor = options.actor;

    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo(params);
    
    return {
      total_count: data.total_count,
      workflow_runs: data.workflow_runs,
    };
  } catch (error: any) {
    console.error('Error fetching repository workflow runs:', error);
    throw new GitHubServiceError(
      error.response?.data?.message || 'Failed to fetch workflow runs',
      error.status || 500
    );
  }
}

/**
 * Get repository pull requests
 */
export async function getRepoPullRequests(
  owner: string,
  repo: string,
  options: {
    page?: number;
    state?: 'open' | 'closed' | 'all';
    perPage?: number;
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
  } = {}
): Promise<PullRequest[]> {
  const {
    page = 1,
    state = 'open',
    perPage = 30,
    sort = 'created',
    direction = 'desc'
  } = options;

  const octokit = createOctokit();

  try {
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state,
      page,
      per_page: perPage,
      sort,
      direction,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    
    return data;
  } catch (error: any) {
    console.error('Error fetching repository pull requests:', error);
    throw new GitHubServiceError(
      error.response?.data?.message || 'Failed to fetch pull requests',
      error.status || 500
    );
  }
}

/**
 * Get repository events
 */
export async function getRepoEvents(
  owner: string,
  repo: string,
  options: {
    page?: number;
    perPage?: number;
  } = {}
): Promise<RepositoryEvent[]> {
  const {
    page = 1,
    perPage = 30
  } = options;

  const octokit = createOctokit();

  try {
    const { data } = await octokit.rest.activity.listRepoEvents({
      owner,
      repo,
      page,
      per_page: perPage,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    
    return data;
  } catch (error: any) {
    console.error('Error fetching repository events:', error);
    throw new GitHubServiceError(
      error.response?.data?.message || 'Failed to fetch repository events',
      error.status || 500
    );
  }
} 