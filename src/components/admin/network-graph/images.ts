/**
 * LRU avatar image cache with circular pre-rendering.
 * - Bounded to MAX_SIZE entries to prevent memory leaks
 * - Pre-renders circular clipped avatars so renderer avoids ctx.clip() per frame
 * - Evicts oldest entries and calls bitmap.close() to free GPU memory
 */

const MAX_SIZE = 1000;

interface CacheEntry {
  image: ImageBitmap;
  lastUsed: number;
}

const imageCache = new Map<string, CacheEntry>();
const pendingUrls = new Set<string>();
const failedUrls = new Set<string>();

function evictIfNeeded() {
  if (imageCache.size <= MAX_SIZE) return;
  // Find and remove least recently used entries
  const entries = [...imageCache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  const toRemove = entries.slice(0, imageCache.size - MAX_SIZE + 50); // evict 50 extra for headroom
  for (const [url, entry] of toRemove) {
    entry.image.close();
    imageCache.delete(url);
  }
}

/**
 * Create a circular-clipped ImageBitmap from the source.
 * This eliminates the need for ctx.clip() in the hot render loop.
 */
async function createCircularBitmap(source: HTMLImageElement): Promise<ImageBitmap> {
  const size = Math.min(source.naturalWidth, source.naturalHeight, 128); // cap resolution
  const offscreen = new OffscreenCanvas(size, size);
  const ctx = offscreen.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(source, 0, 0, size, size);
  return createImageBitmap(offscreen);
}

export function getCachedImage(url: string): ImageBitmap | null {
  if (!url || failedUrls.has(url)) return null;

  const cached = imageCache.get(url);
  if (cached) {
    cached.lastUsed = performance.now();
    return cached.image;
  }

  // Already loading
  if (pendingUrls.has(url)) return null;

  // Start loading
  pendingUrls.add(url);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  img.onload = async () => {
    pendingUrls.delete(url);
    try {
      const bmp = await createCircularBitmap(img);
      imageCache.set(url, { image: bmp, lastUsed: performance.now() });
      evictIfNeeded();
    } catch {
      // Fallback: try plain bitmap
      try {
        const bmp = await createImageBitmap(img);
        imageCache.set(url, { image: bmp, lastUsed: performance.now() });
        evictIfNeeded();
      } catch {
        failedUrls.add(url);
      }
    }
  };
  img.onerror = () => {
    pendingUrls.delete(url);
    failedUrls.add(url);
  };
  return null;
}
