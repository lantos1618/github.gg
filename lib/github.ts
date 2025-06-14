import { Octokit } from "@octokit/rest";
import JSZip from 'jszip';
import { minimatch } from 'minimatch';

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

export async function getAllRepoFiles(
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
    type: 'file' | 'dir' | 'symlink';
    content?: string;
    encoding?: string;
    tooLarge?: boolean;
  }>; 
  branch: string 
}> {
  const octokit = createOctokit(accessToken);
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Get repository metadata to determine the default branch if not provided
  const { data: repoData } = await octokit.rest.repos.get({
    owner: user,
    repo: repo,
  });
  
  const branchToUse = branch || repoData.default_branch;
  if (!branchToUse) {
    throw new GitHubServiceError("Could not determine default branch for repository.", 400);
  }

  // Try to fetch via zipball first (more efficient)
  try {
    const response = await octokit.repos.downloadZipballArchive({
      owner: user,
      repo,
      ref: branchToUse,
      request: {
        // @ts-ignore - The type definition is missing this property
        timeout: 30000 // 30 second timeout
      }
    });

    const zip = new JSZip();
    await zip.loadAsync(response.data as ArrayBuffer);

    const files: Array<{
      path: string;
      name: string;
      size: number;
      type: 'file' | 'dir' | 'symlink';
      content?: string;
      encoding?: string;
      tooLarge?: boolean;
    }> = [];
    
    const promises: Promise<void>[] = [];
    const rootDir = Object.keys(zip.files)[0] || '';
    let fileCount = 0;

    // Process files in parallel
    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      
      // The path in zip is like 'owner-repo-sha12345/path/to/file.txt'
      // We need to strip the root directory
      const correctedPath = relativePath.startsWith(rootDir) 
        ? relativePath.substring(rootDir.length)
        : relativePath;
        
      if (!shouldIncludeFile(correctedPath, mergedOptions)) continue;
      
      fileCount++;
      if (fileCount > mergedOptions.maxFiles) break;
      
      // Skip if file is too large
      const fileSize = (file as any)._data?.uncompressedSize || 0;
      if (fileSize > mergedOptions.maxFileSize) continue;
      
      promises.push(
        (async () => {
          try {
            const content = await file.async('arraybuffer');
            const decoder = new TextDecoder('utf-8');
            let decodedContent = '';
            let isBinary = false;
            
            try {
              // Convert ArrayBuffer to Uint8Array for binary check
              const uint8Array = new Uint8Array(content);
              // Simple check for binary content - look for null bytes in first 512 bytes
              const hasNullByte = uint8Array.slice(0, Math.min(512, uint8Array.length)).some(byte => byte === 0);
              isBinary = hasNullByte;
              
              if (!isBinary) {
                decodedContent = decoder.decode(content);
              }
            } catch (e) {
              // If we can't decode as text, it's likely binary
              isBinary = true;
            }
            
            files.push({
              path: correctedPath,
              name: correctedPath.split('/').pop() || '',
              size: fileSize,
              type: 'file',
              content: isBinary ? '' : decodedContent,
              encoding: isBinary ? 'base64' : 'utf-8',
              tooLarge: false
            });
          } catch (error) {
            console.error(`Error processing file ${correctedPath}:`, error);
          }
        })()
      );
    }
    
    await Promise.all(promises);
    return { files, branch: branchToUse };
  } catch (zipError) {
    console.warn('Failed to process zip archive, falling back to tree API:', zipError);
    
    // Fallback to tree API if zip download fails
    try {
      const { data: treeData } = await octokit.git.getTree({
        owner: user,
        repo,
        tree_sha: branchToUse,
        recursive: 'true',
      });
      
      if (!treeData.tree) {
        throw new Error('No files found in repository');
      }
      
      const files: Array<{
        path: string;
        name: string;
        size: number;
        type: 'file' | 'dir' | 'symlink';
        content?: string;
        encoding?: string;
        tooLarge?: boolean;
      }> = [];
      
      for (const item of treeData.tree) {
        if (files.length >= mergedOptions.maxFiles) break;
        if (item.type !== 'blob' || !item.path) continue;
        
        const path = item.path;
        if (!shouldIncludeFile(path, mergedOptions)) continue;
        
        files.push({
          path,
          name: path.split('/').pop() || '',
          size: item.size || 0,
          type: 'file',
          content: ''
        });
      }
      
      return { files, branch: branchToUse };
    } catch (treeError) {
      console.error('Tree API failed:', treeError);
      throw new GitHubServiceError(
        'Failed to fetch repository contents using both zipball and tree API methods.',
        500
      );
    }
  }
}

export interface CommitListOptions {
  path?: string;
  sha?: string;
  page?: number;
  perPage?: number;
  since?: string;
  until?: string;
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
  path: string
): Promise<FileContentResult> {
  const octokit = createOctokit();
  
  try {
    // Get file content using Octokit's typed method
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // Handle directory response
    if (Array.isArray(data)) {
      throw new GitHubServiceError('Expected a file, but got a directory', 400);
    }

    // Handle non-file responses
    if (data.type !== 'file') {
      throw new GitHubServiceError('Expected a file, but got a different type', 400);
    }

    // Base response data
    const baseResponse = {
      name: data.name,
      path: data.path,
      size: data.size,
      content: '',
      isBinary: false
    };

    try {
      // Decode content from base64
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      
      // Check for binary content
      const isBinary = content.includes('\0') || 
                      countNonPrintableChars(content) / content.length > 0.1;

      if (isBinary) {
        return {
          ...baseResponse,
          content: 'Binary file not shown',
          isBinary: true
        };
      }

      return {
        ...baseResponse,
        content,
        isBinary: false
      };
    } catch (decodeError) {
      // Handle binary content that can't be decoded as text
      console.warn(`Failed to decode ${path} as text:`, decodeError);
      return {
        ...baseResponse,
        content: 'Binary file not shown',
        isBinary: true
      };
    }
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


// Helper function to count non-printable characters
function countNonPrintableChars(str: string): number {
  let count = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    // Count control characters (except common whitespace) and other non-printable chars
    if ((code < 32 && ![9, 10, 13].includes(code)) || (code >= 127 && code <= 159)) {
      count++
    }
  }
  return count
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
