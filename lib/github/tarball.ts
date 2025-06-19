// Fix for missing type declaration for 'tar-stream'
declare module 'tar-stream';
// @ts-ignore
import { Octokit } from '@octokit/rest';
import tar from 'tar-stream';
import { createGunzip } from 'zlib';

export async function extractRepoTarballToMemory({
  owner,
  repo,
  ref = 'main',
  token,
  options = {}
}: {
  owner: string;
  repo: string;
  ref?: string;
  token?: string;
  options?: any;
}): Promise<{
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
  const octokit = new Octokit({ auth: token });
  // Get tarball URL (redirect: 'manual' to get the real URL)
  const { url: tarballUrl } = await octokit.repos.downloadTarballArchive({
    owner,
    repo,
    ref,
    request: { redirect: 'manual' }
  }).then(res => ({ url: res.url }));

  const res = await fetch(tarballUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!res.ok) throw new Error(`Failed to fetch tarball: ${res.status} ${res.statusText}`);
  if (!res.body) throw new Error('No response body from tarball fetch');

  const extract = tar.extract();
  const files: Array<{
    path: string;
    name: string;
    size: number;
    type: 'file';
    content?: string;
    encoding?: string;
    tooLarge?: boolean;
  }> = [];
  const maxFileSize = options.maxFileSize || 1024 * 1024;
  const maxFiles = options.maxFiles || 1000;
  let fileCount = 0;
  let branchName = ref || 'main';

  const stream = res.body.getReader();
  const reader = new ReadableStream({
    async pull(controller) {
      const { done, value } = await stream.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(value);
    }
  });

  // Gunzip the response before passing to tar-stream
  const { Readable } = require('stream');
  const gunzip = createGunzip();
  Readable.from(reader as any).pipe(gunzip).pipe(extract);

  await new Promise<void>((resolve, reject) => {
    extract.on('entry', async (header: any, stream: any, next: any) => {
      if (fileCount >= maxFiles) {
        stream.resume();
        return next();
      }
      if (header.type === 'file') {
        const pathParts = header.name.split('/');
        // Remove the first directory (repo-hash prefix)
        const filePath = pathParts.slice(1).join('/');
        if (!filePath) {
          stream.resume();
          return next();
        }
        let chunks: Buffer[] = [];
        let totalSize = 0;
        stream.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize <= maxFileSize) {
            chunks.push(chunk);
          }
        });
        stream.on('end', () => {
          fileCount++;
          if (totalSize > maxFileSize) {
            files.push({
              path: filePath,
              name: filePath.split('/').pop() || '',
              size: totalSize,
              type: 'file',
              tooLarge: true
            });
          } else {
            const content = Buffer.concat(chunks);
            let encoding = 'utf-8';
            let decoded = '';
            try {
              decoded = content.toString('utf-8');
            } catch {
              encoding = 'base64';
              decoded = content.toString('base64');
            }
            files.push({
              path: filePath,
              name: filePath.split('/').pop() || '',
              size: totalSize,
              type: 'file',
              content: decoded,
              encoding,
              tooLarge: false
            });
          }
          next();
        });
        stream.on('error', next);
      } else {
        stream.resume();
        next();
      }
    });
    extract.on('finish', resolve);
    extract.on('error', reject);
  });

  return { files, branch: branchName };
} 