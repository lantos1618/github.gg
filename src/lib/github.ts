import { Octokit } from '@octokit/rest';
import { auth } from './auth';
import * as tar from 'tar-stream';
import { Readable } from 'stream';
const gunzip = require('gunzip-maybe');

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

export class GitHubService {
  private octokit: Octokit;

  constructor(token?: string) {
    const authToken = token || process.env.GITHUB_PUBLIC_API_KEY;
    
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
    maxFiles: number = 100
  ): Promise<GitHubFilesResponse> {
    try {
      // First, test the token by making a simple API call
      try {
        await this.octokit.rest.users.getAuthenticated();
      } catch (authError: any) {
        if (authError.status === 401) {
          throw new Error('GitHub token is invalid or expired. Please check your GITHUB_PUBLIC_API_KEY environment variable.');
        }
        throw new Error(`GitHub authentication failed: ${authError.message}`);
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
        } catch (repoError: any) {
          if (repoError.status === 404) {
            throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
          }
          throw new Error(`Failed to get repository info: ${repoError.message}`);
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
      } catch (tarballError: any) {
        if (tarballError.status === 404) {
          throw new Error(`Branch or tag '${targetRef}' not found in repository ${owner}/${repo}`);
        }
        throw new Error(`Failed to get tarball: ${tarballError.message}`);
      }

      // The response contains a redirect URL, not the actual data
      const tarballUrl = response.url;

      // Download and extract tarball
      const downloadResponse = await fetch(tarballUrl);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download tarball: ${downloadResponse.status} ${downloadResponse.statusText}`);
      }

      const buffer = await downloadResponse.arrayBuffer();
      const files = await this.extractTarball(buffer, maxFiles);

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

  private async extractTarball(buffer: ArrayBuffer, maxFiles: number): Promise<GitHubFile[]> {
    try {
      const files: GitHubFile[] = [];
      let fileCount = 0;

      // Convert ArrayBuffer to Buffer for tar processing
      const uint8Array = new Uint8Array(buffer);
      const nodeBuffer = Buffer.from(uint8Array);

      // Create readable stream from buffer
      const stream = Readable.from(nodeBuffer);

      // Create tar extract stream
      const extract = tar.extract();

      // Handle each entry in the tar file
      extract.on('entry', (header, stream, next) => {
        if (fileCount >= maxFiles) {
          stream.resume(); // Skip this file
          next();
          return;
        }

        // Skip directories and non-regular files
        if (header.type !== 'file' || header.size === 0) {
          stream.resume(); // Skip this file
          next();
          return;
        }

        // Read file content into memory buffer
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          if (fileCount >= maxFiles) {
            next();
            return;
          }

          try {
            const content = Buffer.concat(chunks).toString('utf8');
            
            // Remove the repository prefix from path (e.g., "repo-name-123abc/")
            const cleanPath = header.name.replace(/^[^/]+\//, '');
            
            files.push({
              path: cleanPath,
              content,
            });
            fileCount++;
          } catch {
            // Skip files that can't be read as UTF-8 (binary files)
            console.warn(`Skipping binary file ${header.name}`);
          }
          next();
        });
      });

      // Handle completion
      extract.on('finish', () => {
        // This will be handled by the promise resolution
      });

      // Handle errors
      extract.on('error', (err) => {
        console.error('Tar extraction error:', err);
      });

      // Process the stream
      await new Promise<void>((resolve, reject) => {
        extract.on('finish', () => resolve());
        extract.on('error', (err) => reject(err));
        stream.pipe(gunzip()).pipe(extract as any);
      });

      return files;
    } catch (error) {
      console.error('Error extracting tarball:', error);
      return [];
    }
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
    return new GitHubService(process.env.GITHUB_PUBLIC_API_KEY);
  } catch {
    console.warn('Failed to get GitHub access token, falling back to public API');
    return new GitHubService(process.env.GITHUB_PUBLIC_API_KEY);
  }
} 