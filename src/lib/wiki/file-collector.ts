import { createPublicGitHubService } from '@/lib/github';

export interface SourceFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

const SOURCE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h'];
const MAX_FILE_SIZE = 100000;
const IGNORED_PATHS = ['node_modules', '.git'];

export async function collectRepositoryFiles(
  owner: string,
  repo: string,
  maxFiles: number = 200
): Promise<SourceFile[]> {
  const githubService = createPublicGitHubService();
  const files: SourceFile[] = [];

  async function collectFiles(path: string, depth = 0): Promise<void> {
    if (depth > 3 || files.length >= maxFiles) return;

    try {
      const items = await githubService['octokit'].repos.getContent({
        owner,
        repo,
        path,
      });

      if (!Array.isArray(items.data)) return;

      // Separate files and directories
      const fileItems: typeof items.data = [];
      const dirItems: typeof items.data = [];

      for (const item of items.data) {
        if (files.length >= maxFiles) break;

        if (item.type === 'file') {
          const ext = item.name.split('.').pop()?.toLowerCase();

          if (ext && SOURCE_EXTENSIONS.includes(ext) && item.size && item.size < MAX_FILE_SIZE) {
            fileItems.push(item);
          }
        } else if (item.type === 'dir' && !IGNORED_PATHS.some(ignored => item.path.includes(ignored))) {
          dirItems.push(item);
        }
      }

      // Fetch all files in parallel (limit concurrency to 10)
      const chunkSize = 10;
      for (let i = 0; i < fileItems.length; i += chunkSize) {
        if (files.length >= maxFiles) break;

        const chunk = fileItems.slice(i, i + chunkSize);
        const fileResults = await Promise.allSettled(
          chunk.map(item =>
            githubService['octokit'].repos.getContent({
              owner,
              repo,
              path: item.path,
            })
          )
        );

        for (let j = 0; j < fileResults.length; j++) {
          if (files.length >= maxFiles) break;

          const result = fileResults[j];
          if (result.status === 'fulfilled' && 'content' in result.value.data) {
            const item = chunk[j];
            const content = Buffer.from(result.value.data.content, 'base64').toString('utf-8');
            const ext = item.name.split('.').pop()?.toLowerCase() || '';

            files.push({
              path: item.path,
              content,
              language: ext,
              size: item.size || 0,
            });
          }
        }
      }

      // Recursively collect from directories in parallel (limit to 5 at a time)
      const dirChunkSize = 5;
      for (let i = 0; i < dirItems.length; i += dirChunkSize) {
        if (files.length >= maxFiles) break;

        const chunk = dirItems.slice(i, i + dirChunkSize);
        await Promise.all(
          chunk.map(item => collectFiles(item.path, depth + 1))
        );
      }
    } catch (error) {
      console.error(`Failed to collect files from ${path}:`, error);
    }
  }

  await collectFiles('');
  return files;
}
