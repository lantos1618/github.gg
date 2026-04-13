/**
 * Global avatar image cache. Loads images lazily, promotes to ImageBitmap for GPU-friendly Canvas drawing.
 */
const imageCache = new Map<string, HTMLImageElement | ImageBitmap>();
const failedUrls = new Set<string>();

export function getCachedImage(url: string): HTMLImageElement | ImageBitmap | null {
  if (!url || failedUrls.has(url)) return null;

  const cached = imageCache.get(url);
  if (cached) {
    // ImageBitmap is always ready to draw
    if (cached instanceof ImageBitmap) return cached;
    // HTMLImageElement — only return if fully loaded
    if ((cached as HTMLImageElement).complete && (cached as HTMLImageElement).naturalWidth > 0) return cached;
    return null; // still loading
  }

  // Start loading
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  imageCache.set(url, img);
  img.onload = async () => {
    try {
      const bmp = await createImageBitmap(img);
      imageCache.set(url, bmp);
    } catch {
      // fallback to HTMLImageElement (already in cache)
    }
  };
  img.onerror = () => {
    imageCache.delete(url);
    failedUrls.add(url);
  };
  return null;
}
