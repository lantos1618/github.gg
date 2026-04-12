/**
 * Global avatar image cache. Loads images lazily, promotes to ImageBitmap for GPU-friendly Canvas drawing.
 */
const imageCache = new Map<string, HTMLImageElement | ImageBitmap>();

export function getCachedImage(url: string): HTMLImageElement | ImageBitmap | null {
  if (imageCache.has(url)) return imageCache.get(url)!;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  imageCache.set(url, img);
  img.onload = async () => {
    try {
      const bmp = await createImageBitmap(img);
      imageCache.set(url, bmp);
    } catch {
      // fallback to HTMLImageElement
    }
  };
  return null; // not loaded yet, caller should draw a colored circle
}
