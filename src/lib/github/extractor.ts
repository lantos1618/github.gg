import * as tar from 'tar-stream';
import { Readable } from 'stream';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gunzip = require('gunzip-maybe');
import { GitHubFile } from './types';
import { shouldProcessFile } from './filters';

export async function extractTarball(
  buffer: ArrayBuffer, 
  maxFiles: number, 
  path?: string
): Promise<GitHubFile[]> {
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

    if (!shouldProcessFile(cleanPath, path)) {
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
          files.push({ path: cleanPath, content, size: header.size || 0, type: 'file' });
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