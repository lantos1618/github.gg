import { GitHubFile } from './types';
import { shouldProcessFile } from './filters';
import { createGunzip } from 'zlib';
import tarStream from 'tar-stream';

export async function extractTarball(
  stream: NodeJS.ReadableStream,
  onFile: (file: GitHubFile) => void,
  path?: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const gunzip = createGunzip();
    const extract = tarStream.extract();

    extract.on('entry', (header, entryStream, next) => {
      if (header.type === 'file' && shouldProcessFile(header.name, path)) {
        const chunks: Buffer[] = [];
        entryStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        entryStream.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf8');
          onFile({
            path: header.name,
            content,
            size: content.length,
            type: 'file',
          });
          next();
        });
        entryStream.on('error', reject);
      } else {
        entryStream.resume();
        entryStream.on('end', next);
      }
    });
    extract.on('finish', resolve);
    extract.on('error', reject);
    stream.pipe(gunzip).pipe(extract);
  }).catch(error => {
    console.error('Error processing tarball stream:', error);
    throw error;
  });
} 