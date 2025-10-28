/**
 * Sanitize text content to prevent XSS and rendering issues
 * Removes potentially dangerous characters that could break HTML parsing
 */
export function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';

  // Remove control characters and other problematic chars
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize an array of strings
 */
export function sanitizeArray(arr: string[] | undefined | null): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(sanitizeText).filter(Boolean);
}
