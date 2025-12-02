/**
 * URL utility functions for normalizing and handling URLs across the application
 */

/**
 * Normalizes an origin URL by removing www subdomain
 * Uses proper URL parsing for safety and consistency
 * 
 * @param origin - The origin URL to normalize (e.g., "https://www.github.gg")
 * @returns The normalized origin without www subdomain
 */
export function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    
    // Remove www subdomain using proper hostname manipulation
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.substring(4);
    }
    
    // Rebuild origin with normalized hostname
    const normalizedOrigin = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
    return normalizedOrigin;
  } catch {
    // If URL parsing fails, return as-is (shouldn't happen in production)
    return origin;
  }
}

/**
 * Gets the base URL for API calls, normalizing www subdomain
 * This ensures consistent API endpoints regardless of how the user accessed the site
 * 
 * The normalization prevents redirect loops and ensures Better Auth works correctly
 * when users access the site via www subdomain which redirects to non-www
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const normalizedOrigin = normalizeOrigin(window.location.origin);
    return `${normalizedOrigin}/api`;
  }
  
  // Server-side: use environment variable and normalize
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://github.gg';
  const normalizedUrl = normalizeOrigin(appUrl);
  return `${normalizedUrl}/api`;
}

/**
 * Gets the base URL for Better Auth API calls
 * Uses normalized origin to prevent redirect issues with www subdomain
 */
export function getAuthBaseUrl(): string {
  const apiBase = getApiBaseUrl();
  return `${apiBase}/auth`;
}

