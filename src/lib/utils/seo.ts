/**
 * SEO utility functions for canonical URLs and metadata
 */

/**
 * Normalizes a URL to the preferred canonical format
 * - Removes www subdomain
 * - Removes query parameters
 * - Ensures https protocol
 * - Ensures no trailing slash (except for root)
 */
export function normalizeCanonicalUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove www subdomain
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }
    
    // Ensure https
    urlObj.protocol = 'https:';
    
    // Remove query parameters
    urlObj.search = '';
    urlObj.hash = '';
    
    // Remove trailing slash (except for root)
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
      urlObj.pathname = pathname;
    }
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return as-is (shouldn't happen in production)
    return url;
  }
}

/**
 * Builds a canonical URL for a given path
 */
export function buildCanonicalUrl(path: string): string {
  const baseUrl = 'https://github.gg';
  // Remove leading/trailing slashes and rebuild
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  const url = cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
  return normalizeCanonicalUrl(url);
}

/**
 * Valid tabs that are allowed in repo URLs
 */
export const VALID_TABS = [
  "scorecard",
  "diagram",
  "ai-slop",
  "refactor",
  "automations",
  "issues",
  "pulls",
  "dependencies",
  "architecture",
  "components",
  "data-flow"
] as const;

/**
 * Invalid tabs that should return 404
 * These are GitHub routes that we don't support
 */
export const INVALID_TABS = [
  "actions",
  "security",
  "settings",
  "insights",
  "wiki",
  "projects",
  "commits",
  "commit",
  "branches",
  "releases",
  "tags",
  "contributors",
  "graphs",
  "network",
  "pulse",
  "community",
  "codeowners",
  "sigma"
] as const;

/**
 * Checks if a tab is invalid and should return 404
 */
export function isInvalidTab(tab: string | undefined): boolean {
  if (!tab) return false;
  return INVALID_TABS.includes(tab as typeof INVALID_TABS[number]);
}

