import { describe, it, expect } from 'bun:test';
import { getAllRepoFilesWithTar, GitHubServiceError, getFileContent } from '@/lib/github';

// Define the file type for our test
interface RepoFile {
  path: string;
  name: string;
  size: number;
  type: 'file' | 'dir' | 'symlink';
  content?: string;
  encoding?: string;
  tooLarge?: boolean;
}

// Test configuration - using a small, public repository for testing
const TEST_REPO_OWNER = 'facebook';
const TEST_REPO_NAME = 'react';
const TEST_BRANCH = 'main';
const TEST_FILE_PATH = 'README.md';

// Enable debug logging
const DEBUG = true;
function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

describe('GitHub Tarball Integration', () => {

  it('should fetch repository files via direct GitHub API', async () => {
    const options = {
      maxFileSize: 1024 * 1024, // 1MB
      maxFiles: 10, // Limit to 10 files for testing
      includeExtensions: ['.md', '.js', '.ts', '.json'],
      excludePaths: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      includeContent: true
    };

    try {
      debugLog('Fetching repository files...');
      const result = await getAllRepoFilesWithTar(
        TEST_REPO_OWNER,
        TEST_REPO_NAME,
        TEST_BRANCH,
        process.env.GITHUB_TOKEN, // Use token if available
        options
      );

      debugLog(`Fetched ${result.files.length} files from ${TEST_REPO_OWNER}/${TEST_REPO_NAME}`);
      debugLog('Sample files:', result.files.slice(0, 3).map(f => ({
        path: f.path,
        size: f.size,
        type: f.type,
        content: f.content ? f.content.substring(0, 100) : undefined
      })));

      expect(Array.isArray(result.files)).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.branch).toBeDefined();
    } catch (error) {
      if (error instanceof GitHubServiceError) {
        console.error('GitHub Service Error:', {
          statusCode: error.statusCode,
          message: error.message
        });
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  });

  it('should fetch file content via direct GitHub API', async () => {
    try {
      debugLog(`Fetching file content for ${TEST_FILE_PATH}...`);
      const result = await getFileContent(
        TEST_REPO_OWNER,
        TEST_REPO_NAME,
        TEST_BRANCH,
        TEST_FILE_PATH
      );

      debugLog(`Fetched ${TEST_FILE_PATH} (${result.size} bytes)`);
      debugLog('Content sample:', result.content?.substring(0, 100) + '...');
      
      expect(result).toHaveProperty('content');
      expect(result.content).toBeTruthy();
      expect(result.path).toBe(TEST_FILE_PATH);
    } catch (error) {
      if (error instanceof GitHubServiceError) {
        console.error('GitHub Service Error:', {
          statusCode: error.statusCode,
          message: error.message
        });
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  });

  it('should handle errors gracefully', async () => {
    // Test error handling for non-existent repository
    await expect(
      getAllRepoFilesWithTar('nonexistent-owner', 'nonexistent-repo', 'main')
    ).rejects.toThrow(GitHubServiceError);
  });
  
  it('should use cache for subsequent requests', async () => {
    // First request - should fetch from GitHub
    const firstResult = await getAllRepoFilesWithTar(
      TEST_REPO_OWNER,
      TEST_REPO_NAME,
      TEST_BRANCH,
      process.env.GITHUB_TOKEN,
      {
        maxFiles: 5,
        includeExtensions: ['.md'],
        includeContent: true
      }
    );
    
    // Second request - should use cache
    const secondResult = await getAllRepoFilesWithTar(
      TEST_REPO_OWNER,
      TEST_REPO_NAME,
      TEST_BRANCH,
      process.env.GITHUB_TOKEN,
      {
        maxFiles: 5,
        includeExtensions: ['.md'],
        includeContent: true
      }
    );
    
    // Verify we got the same result
    expect(secondResult.files.length).toBe(firstResult.files.length);
    expect(secondResult.files[0]?.path).toBe(firstResult.files[0]?.path);
  });

  it('should fetch repository files using tarball', async () => {
    const options = {
      maxFileSize: 1024 * 1024, // 1MB
      maxFiles: 10, // Limit to 10 files for testing
      includeExtensions: ['.md'],
      excludePaths: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      includeContent: true
    };

    try {
      debugLog('Fetching repository files...');
      const result = await getAllRepoFilesWithTar(
        TEST_REPO_OWNER,
        TEST_REPO_NAME,
        TEST_BRANCH,
        process.env.GITHUB_TOKEN, // Use token if available
        options
      );

      debugLog(`Fetched ${result.files.length} files from ${TEST_REPO_OWNER}/${TEST_REPO_NAME}`);
      debugLog('Sample files:', result.files.slice(0, 3).map(f => ({
        path: f.path,
        size: f.size,
        type: f.type,
        content: f.content ? f.content.substring(0, 100) : undefined
      })));

      // Basic assertions
      expect(Array.isArray(result.files)).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.branch).toBeDefined();
      
      // Verify we have markdown files (as per includeExtensions)
      const hasMarkdownFiles = result.files.some(f => f.path.endsWith('.md'));
      expect(hasMarkdownFiles).toBe(true);
      
      // Verify file content is included
      const fileWithContent = result.files.find(f => f.content);
      expect(fileWithContent).toBeDefined();
      
      if (fileWithContent) {
        expect(typeof fileWithContent.content).toBe('string');
        expect(fileWithContent.content?.length).toBeGreaterThan(0);
      }
      
    } catch (error) {
      if (error instanceof GitHubServiceError) {
        console.error('GitHub Service Error:', {
          statusCode: error.statusCode,
          message: error.message
        });
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  });

  it.todo('should fetch files via tRPC endpoint');
});
