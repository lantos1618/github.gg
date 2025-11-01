import { createPublicGitHubService } from '@/lib/github';

export interface SourceFile {
  path: string;
  content: string;
  size: number;
}

/**
 * Fetches specific files from a GitHub repository by their paths.
 * This is used for scorecard and AI slop analysis where users select specific files.
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param paths - Array of file paths to fetch
 * @param ref - Git ref (branch/tag/commit), defaults to 'main'
 * @returns Array of files with their content
 */
export async function fetchFilesByPaths(
  owner: string,
  repo: string,
  paths: string[],
  ref: string = 'main'
): Promise<SourceFile[]> {
  const githubService = createPublicGitHubService();
  const files: SourceFile[] = [];

  // Fetch files in batches to avoid overwhelming GitHub API
  const BATCH_SIZE = 10;

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (path) => {
        try {
          const response = await githubService['octokit'].repos.getContent({
            owner,
            repo,
            path,
            ref,
          });

          // Ensure it's a file (not directory)
          if ('content' in response.data && response.data.type === 'file') {
            const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

            return {
              path,
              content,
              size: response.data.size,
            };
          }

          return null;
        } catch (error) {
          console.error(`Failed to fetch file ${path}:`, error);
          return null;
        }
      })
    );

    // Collect successful results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        files.push(result.value);
      }
    }
  }

  return files;
}
