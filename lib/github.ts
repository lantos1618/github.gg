import { Octokit } from "@octokit/rest";
import JSZip from 'jszip';
import { minimatch } from 'minimatch';

// Import types from the types directory
import type {
  RepoFile,
  FileProcessingOptions,
  Issue,
  CommitData,
  FileContentResult
} from '@/lib/types/github';

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || "";

// Default file processing options
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
  if (mergedOptions.includeExtensions?.length > 0) {
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
  try {
    const octokit = createOctokit(accessToken)
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

    // Get repository metadata to determine the default branch if not provided
    const { data: repoData } = await octokit.rest.repos.get({
      owner: user,
      repo: repo,
    })
    
    const branchToUse = branch || repoData.default_branch
    if (!branchToUse) {
      throw new GitHubServiceError("Could not determine default branch for repository.", 400)
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
      })

      const zip = new JSZip()
      await zip.loadAsync(response.data as ArrayBuffer)

      const files: RepoFile[] = []
      const promises: Promise<void>[] = []
      const rootDir = Object.keys(zip.files)[0] || ''
      let fileCount = 0

      // Process files in parallel
      for (const [relativePath, file] of Object.entries(zip.files)) {
        if (fileCount >= mergedOptions.maxFiles) break
        if (file.dir) continue
        
        // The path in zip is like 'owner-repo-sha12345/path/to/file.txt'
        // We need to strip the root directory
        const correctedPath = relativePath.startsWith(rootDir) 
          ? relativePath.substring(rootDir.length)
          : relativePath

        if (!correctedPath || !shouldIncludeFile(correctedPath, mergedOptions)) {
          continue
        }

        fileCount++
        const promise = (async () => {
          try {
            if (mergedOptions.includeContent) {
              const content = await file.async('string')
              if (content.length > mergedOptions.maxFileSize) {
                files.push({
                  path: correctedPath,
                  name: correctedPath.split('/').pop() || '',
                  size: content.length,
                  type: 'file',
                  tooLarge: true,
                  content: ''
                })
                return
              }
              
              files.push({
                path: correctedPath,
                name: correctedPath.split('/').pop() || '',
                content: content,
                size: content.length,
                type: 'file',
                encoding: 'utf-8'
              })
            } else {
              files.push({
                path: correctedPath,
                name: correctedPath.split('/').pop() || '',
                size: 0,
                type: 'file',
                encoding: 'utf-8'
              })
            }
          } catch (e) {
            console.warn(`Could not process file ${correctedPath}:`, e)
          }
        })()
        promises.push(promise)

        if (promises.length >= 10) { // Process in batches of 10
          await Promise.all(promises.splice(0, promises.length))
        }
      }

      // Wait for any remaining promises
      await Promise.all(promises)

      // Sort files by path for consistent ordering
      files.sort((a, b) => a.path.localeCompare(b.path))

      return { files, branch: branchToUse }
    } catch (zipError) {
      console.warn('Zipball download failed, falling back to recursive tree API:', zipError)
      
      // Fallback to recursive tree API
      try {
        const { data: treeData } = await octokit.rest.git.getTree({
          owner: user,
          repo: repo,
          tree_sha: branchToUse,
          recursive: 'true',
        })

        const files: Array<{
          path: string;
          name: string;
          size: number;
          type: 'file' | 'dir' | 'symlink';
          content?: string;
          encoding?: string;
          tooLarge?: boolean;
        }> = []
        
        for (const item of treeData.tree) {
          if (files.length >= mergedOptions.maxFiles) break
          if (item.type !== 'blob' || !item.path) continue
          
          const path = item.path
          if (!shouldIncludeFile(path, mergedOptions)) continue
          
          files.push({
            path,
            name: path.split('/').pop() || '',
            size: item.size || 0,
            type: 'file',
            content: ''
          })
        }
        
        return { files, branch: branchToUse }
      } catch (treeError) {
        console.error('Recursive tree API also failed:', treeError)
        throw new GitHubServiceError(
          'Failed to fetch repository contents using both zipball and tree API methods.',
          500
        )
      }
    }
  } catch (error) {
    console.error('Error in getAllRepoFiles:', error)
    if (error instanceof GitHubServiceError) throw error
    throw new GitHubServiceError(
      error instanceof Error ? error.message : 'Failed to fetch repository contents',
      500
    )
  }
}

// CommitData type is imported from '@/lib/types/github'

export async function getCommitData(
  owner: string,
  repo: string,
  sha: string
): Promise<CommitData> {
  const octokit = createOctokit();
  
  try {
    const { data } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    
    return data as unknown as CommitData;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error fetching commit data for ${owner}/${repo}@${sha}:`, error.message);
      throw new GitHubServiceError(
        `Failed to fetch commit data: ${error.message}`,
        'status' in error ? (error as any).status : 500
      );
    }
    throw new GitHubServiceError('An unknown error occurred while fetching commit data', 500);
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
// Note: getRepositoryAsText and FileContent interface have been removed in favor of RepoArchiveService
