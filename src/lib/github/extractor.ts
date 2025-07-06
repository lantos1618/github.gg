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
    
    // Extract the top-level directory from the first entry
    let topLevelDir: string | null = null;
    let isFirstEntry = true;

    extract.on('entry', (header, entryStream, next) => {
      // Extract top-level directory from the first entry
      if (isFirstEntry) {
        const pathParts = header.name.split('/');
        topLevelDir = pathParts[0];
        isFirstEntry = false;
        console.log('[extractor] Top-level directory:', topLevelDir);
      }
      
      if (header.type === 'file' && shouldProcessFile(header.name, path, topLevelDir)) {
        const chunks: Buffer[] = [];
        entryStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        entryStream.on('end', () => {
          const content = Buffer.concat(chunks).toString('utf8');
          
          // Strip tarball prefix using the extracted top-level directory
          const strippedPath = topLevelDir && header.name.startsWith(topLevelDir + '/') 
            ? header.name.substring(topLevelDir.length + 1) 
            : header.name;
          
          onFile({
            path: strippedPath,
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