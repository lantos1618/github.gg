import { Octokit } from '@octokit/rest';
import { auth } from './auth';
import * as tar from 'tar-stream';
import { Readable } from 'stream';
import { env } from './env';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gunzip = require('gunzip-maybe');

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

// File filtering configuration
const FILE_FILTER_CONFIG = {
  // A more organized and comprehensive allow-list for file extensions and names.
  allowList: {
    // Common Languages
    languages: [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp', 
      '.cs', '.go', '.rs', '.swift', '.kt', '.scala', '.php', '.pl', '.sh', '.bash', '.zsh', 
      '.ps1', '.lua', '.groovy', '.r', '.dart', '.hs', '.erl', '.ex', '.exs'
    ],
    // Web & Frontend
    web: ['.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl', '.vue', '.svelte'],
    // Config Files
    config: [
      '.json', '.xml', '.yml', '.yaml', '.toml', '.ini', '.env', '.properties', '.babelrc', 
      '.eslintrc', '.prettierrc', '.browserslistrc', '.gitattributes', '.gitignore', '.editorconfig', 
      'tsconfig.json', 'package.json', 'webpack.config.js', 'vite.config.js', 'next.config.js',
      'tailwind.config.js', 'postcss.config.js', 'jest.config.js', 'cypress.config.js',
      'playwright.config.js', '.npmrc', '.yarnrc'
    ],
    // Documentation & Data
    docs: ['.md', '.mdx', '.txt', '.rst', '.adoc', '.csv', '.tsv', '.sql', '.graphql', '.gql'],
    // Build & Infrastructure
    build: [
      'Dockerfile', 'docker-compose.yml', '.dockerignore', 'Makefile', 'CMakeLists.txt', 
      'pom.xml', 'build.gradle', 'Vagrantfile', '.tf', '.tfvars'
    ],
    // Exact filenames to always include
    exactNames: ['README', 'LICENSE', 'CONTRIBUTING', 'CHANGELOG', 'CODE_OF_CONDUCT']
  },

  // Deny-list for extensions that are often binary, generated, or not useful.
  deniedExtensions: new Set([
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
    // Fonts
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // Videos & Audio
    '.mp4', '.avi', '.mov', '.mp3', '.wav', '.flac',
    // Compiled/Binary
    '.exe', '.dll', '.so', '.a', '.o', '.class', '.pyc', '.wasm',
    // Archives
    '.zip', '.tar', '.gz', '.rar', '.7z',
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Other
    '.lock', '.log', '.tmp', '.cache', '.suo', '.ntvs_analysis.dat',
    '.pdb', '.db', '.sqlite', '.sqlite3'
  ]),

  // Deny-list for paths. Any file within these directories will be skipped.
  deniedPaths: [
    'node_modules/', 'vendor/', 'dist/', 'build/', 'bin/', 'obj/', '.git/', 
    '.svn/', '.hg/', '.idea/', '.vscode/', '__pycache__/', 'target/', 'out/'
  ]
};

// Combine all allowed extensions into a single Set for fast lookups.
const ALLOWED_EXTENSIONS = new Set([
  ...FILE_FILTER_CONFIG.allowList.languages,
  ...FILE_FILTER_CONFIG.allowList.web,
  ...FILE_FILTER_CONFIG.allowList.config,
  ...FILE_FILTER_CONFIG.allowList.docs
]);

export class GitHubService {
  private octokit: Octokit;

  constructor(token?: string) {
    const authToken = token || env.GITHUB_PUBLIC_API_KEY;
    
    if (!authToken) {
      throw new Error('No GitHub token available');
    }

    // Validate token format
    if (!authToken.startsWith('ghp_') && !authToken.startsWith('gho_') && !authToken.startsWith('ghu_')) {
      console.warn('GitHub token format appears invalid. Expected format: ghp_xxxxxxxxxxxxxxxxxxxx');
    }

    this.octokit = new Octokit({
      auth: authToken,
    });
  }

  async getRepositoryFiles(
    owner: string,
    repo: string,
    ref?: string,
    maxFiles: number = DEFAULT_MAX_FILES,
    path?: string
  ): Promise<GitHubFilesResponse> {
    try {
      // First, test the token by making a simple API call
      try {
        await this.octokit.rest.users.getAuthenticated();
      } catch (authError: unknown) {
        const error = authError as { status?: number; message?: string };
        if (error.status === 401) {
          throw new Error('GitHub token is invalid or expired. Please check your GITHUB_PUBLIC_API_KEY environment variable.');
        }
        throw new Error(`GitHub authentication failed: ${error.message}`);
      }

      // If no ref provided, get the default branch
      let targetRef = ref;
      if (!targetRef) {
        try {
          const repoInfo = await this.octokit.repos.get({
            owner,
            repo,
          });
          targetRef = repoInfo.data.default_branch;
        } catch (repoError: unknown) {
          const error = repoError as { status?: number; message?: string };
          if (error.status === 404) {
            throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
          }
          throw new Error(`Failed to get repository info: ${error.message}`);
        }
      }

      // Get tarball URL
      let response;
      try {
        response = await this.octokit.repos.downloadTarballArchive({
          owner,
          repo,
          ref: targetRef,
        });
      } catch (tarballError: unknown) {
        const error = tarballError as { status?: number; message?: string };
        if (error.status === 404) {
          throw new Error(`Branch or tag '${targetRef}' not found in repository ${owner}/${repo}`);
        }
        throw new Error(`Failed to get tarball: ${error.message}`);
      }

      // The response contains a redirect URL, not the actual data
      const tarballUrl = response.url;

      // Download and extract tarball
      const downloadResponse = await fetch(tarballUrl);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download tarball: ${downloadResponse.status} ${downloadResponse.statusText}`);
      }

      const buffer = await downloadResponse.arrayBuffer();
      const files = await this.extractTarball(buffer, maxFiles, path);
      
      return {
        files,
        totalFiles: files.length,
        owner,
        repo,
        ref: targetRef,
      };
    } catch (error) {
      console.error('GitHub service error:', error);
      throw error;
    }
  }

  private shouldProcessFile(filePath: string, path?: string): boolean {
    const lowerFilePath = filePath.toLowerCase();
    const fileName = filePath.split('/').pop() || '';

    // 0. Filter by path if specified
    if (path && !filePath.startsWith(path + '/') && filePath !== path) {
      return false;
    }

    // 1. Deny if it's in a denied directory.
    if (FILE_FILTER_CONFIG.deniedPaths.some(p => lowerFilePath.startsWith(p))) {
      return false;
    }

    // 2. Deny if it has a denied extension.
    const extension = (fileName.includes('.') ? '.' + fileName.split('.').pop() : '').toLowerCase();
    if (extension && FILE_FILTER_CONFIG.deniedExtensions.has(extension)) {
      return false;
    }
    
    // 3. Deny minified files
    if (lowerFilePath.endsWith('.min.js') || lowerFilePath.endsWith('.min.css')) {
      return false;
    }

    // 4. Allow if it's an exact name match (e.g., README).
    if (FILE_FILTER_CONFIG.allowList.exactNames.includes(fileName)) {
      return true;
    }

    // 5. Allow if it has an allowed extension.
    if (extension && ALLOWED_EXTENSIONS.has(extension)) {
      return true;
    }

    // 6. Allow common config file patterns that don't have extensions.
    if (FILE_FILTER_CONFIG.allowList.build.includes(fileName) || fileName.endsWith('rc')) {
      return true;
    }

    return false;
  }

  private async extractTarball(buffer: ArrayBuffer, maxFiles: number, path?: string): Promise<GitHubFile[]> {
    const files: GitHubFile[] = [];
    let fileCount = 0;
    
    // Convert ArrayBuffer to Buffer for tar processing
    const nodeBuffer = Buffer.from(new Uint8Array(buffer));
    const stream = Readable.from(nodeBuffer);
    const extract = tar.extract();

    extract.on('entry', (header, stream, next) => {
      if (fileCount >= maxFiles) {
        stream.resume();
        next();
        return;
      }

      if (header.type !== 'file' || header.size === 0) {
        stream.resume();
        next();
        return;
      }

      // Remove the top-level directory from the path.
      const cleanPath = header.name.replace(/^[^/]+\//, '');

      if (!this.shouldProcessFile(cleanPath, path)) {
        stream.resume();
        next();
        return;
      }

      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        if (fileCount < maxFiles) {
          try {
            const content = Buffer.concat(chunks).toString('utf8');
            files.push({ path: cleanPath, content });
            fileCount++;
          } catch {
            console.warn(`Skipping file that could not be decoded as UTF-8: ${cleanPath}`);
          }
        }
        next();
      });
      stream.on('error', (err) => {
        console.error(`Error reading stream for ${cleanPath}:`, err);
        next(); // Move to the next entry even if one stream fails
      });
    });

    await new Promise<void>((resolve, reject) => {
      extract.on('finish', resolve);
      extract.on('error', reject);
      stream.pipe(gunzip()).pipe(extract as unknown as NodeJS.ReadableStream).on('error', reject);
    }).catch(error => {
        console.error('Error processing tarball stream:', error);
        // Don't re-throw, just return whatever files we managed to extract.
    });

    return files;
  }
}

// Factory function to create GitHub service with session
export async function createGitHubService(session: unknown, req?: Request): Promise<GitHubService> {
  try {
    // Use Better Auth's getAccessToken method to get fresh token
    if (session && typeof session === 'object' && 'user' in session && 
        session.user && typeof session.user === 'object' && 'id' in session.user && req) {
      const { accessToken } = await auth.api.getAccessToken({
        body: {
          providerId: 'github',
          userId: session.user.id as string,
        },
        headers: req.headers,
      });
      
      if (accessToken) {
        return new GitHubService(accessToken);
      }
    }
    
    // Fallback to public API key
    return new GitHubService(env.GITHUB_PUBLIC_API_KEY);
  } catch {
    console.warn('Failed to get GitHub access token, falling back to public API');
    return new GitHubService(env.GITHUB_PUBLIC_API_KEY);
  }
} 