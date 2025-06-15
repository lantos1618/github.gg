// Simple in-memory cache for GitHub repository contents
interface RepoCacheEntry {
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  data: {
    [filePath: string]: {
      content: string;
      encoding: 'utf-8' | 'base64';
      size: number;
      isBinary: boolean;
    };
  };
  branch: string;
}

const REPO_CACHE = new Map<string, RepoCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(owner: string, repo: string): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

export function getFromCache(owner: string, repo: string, path: string, branch: string): { content: string; encoding: 'utf-8' | 'base64'; size: number; isBinary: boolean } | null {
  const key = getCacheKey(owner, repo);
  const entry = REPO_CACHE.get(key);
  
  if (!entry) return null;
  
  // Check if cache entry is expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    REPO_CACHE.delete(key);
    return null;
  }
  
  // Check if the branch matches
  if (entry.branch !== branch) {
    return null;
  }
  
  return entry.data[path] || null;
}

export function setInCache(
  owner: string, 
  repo: string, 
  branch: string, 
  files: Array<{
    path: string;
    content: string;
    encoding: 'utf-8' | 'base64';
    size: number;
    isBinary: boolean;
  }>,
  ttl: number = CACHE_TTL
): void {
  const key = getCacheKey(owner, repo);
  const data: RepoCacheEntry['data'] = {};
  
  for (const file of files) {
    data[file.path] = {
      content: file.content,
      encoding: file.encoding,
      size: file.size,
      isBinary: file.isBinary
    };
  }
  
  REPO_CACHE.set(key, {
    timestamp: Date.now(),
    ttl,
    data,
    branch
  });
}

export function clearCache(owner: string, repo: string): void {
  const key = getCacheKey(owner, repo);
  REPO_CACHE.delete(key);
}
