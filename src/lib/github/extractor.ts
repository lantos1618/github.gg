import { GitHubFile } from './types';
import { shouldProcessFile } from './filters';
import { createGunzip } from 'zlib';
import { extract } from 'tar';
import type { ReadEntry } from 'tar';

export async function extractTarball(
  stream: NodeJS.ReadableStream,
  onFile: (file: GitHubFile) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const gunzip = createGunzip();
    const extractStream = extract({
      filter: (path: string) => shouldProcessFile(path),
      onentry: (entry: ReadEntry) => {
        const chunks: Buffer[] = [];
        entry.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        entry.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf8');
          onFile({
            path: entry.path,
            content,
            size: content.length,
            type: 'file',
          });
        });
      },
    });

    extractStream.on('finish', resolve);
    extractStream.on('error', reject);
    stream.pipe(gunzip).pipe(extractStream).on('error', reject);
  }).catch(error => {
      console.error('Error processing tarball stream:', error);
      throw error;
  });
} 