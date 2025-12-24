import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStars(stars: number): string {
  if (stars >= 1_000_000) {
    const millions = stars / 1_000_000;
    return `${millions.toFixed(millions < 10 ? 1 : 0)}M`;
  }
  if (stars >= 1_000) {
    const thousands = stars / 1_000;
    return `${thousands.toFixed(thousands < 10 ? 1 : 0)}k`;
  }
  return stars.toString();
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Parses segments to find the longest matching branch name
 * Supports branches with slashes by trying longest matches first
 *
 * @param segments - URL segments to parse
 * @param branchNames - List of known branch names from the repository
 * @returns Parsed branch name and remaining path
 */
export function parseBranchAndPath(
  segments: string[],
  branchNames: string[]
): { branch: string; path?: string } {
  if (segments.length === 0) {
    return { branch: 'main' };
  }

  // Try matching from longest to shortest to handle branches with slashes
  // E.g., "feature/new-ui/components" should match before "feature/new-ui"
  for (let i = segments.length; i > 0; i--) {
    const candidate = segments.slice(0, i).join('/');
    if (branchNames.includes(candidate)) {
      const remainingPath = segments.slice(i).join('/') || undefined;
      return { branch: candidate, path: remainingPath };
    }
  }

  // Fallback: treat first segment as branch name
  const remainingPath = segments.slice(1).join('/') || undefined;
  return { branch: segments[0], path: remainingPath };
}

// Known tab paths in the application
const TAB_PATHS = [
  "scorecard",
  "diagram",
  "ai-slop",
  "automations",
  "issues",
  "pulls",
  "dependencies",
  "architecture",
  "components",
  "data-flow"
] as const;

interface ParseRepoPathParams {
  user: string;
  params?: string[];
}

interface ParseRepoPathResult {
  user: string;
  repo?: string;
  ref?: string;
  path?: string;
  tab?: string;
  currentPath: string;
}

/**
 * Parses GitHub-style repository URLs from Next.js route params
 *
 * Supported patterns:
 * - /user/repo
 * - /user/repo/tree/branch
 * - /user/repo/tree/branch/path
 * - /user/repo/tab
 * - /user/repo/branch
 * - /user/repo/branch/path
 *
 * @param params - Next.js route parameters
 * @param branchNames - Known branch names for accurate slash-handling (optional)
 * @returns Parsed repository path components
 */
export function parseRepoPath(
  params: ParseRepoPathParams,
  branchNames: string[] = []
): ParseRepoPathResult {
  const { user, params: segments = [] } = params;

  if (segments.length === 0) {
    return { user, currentPath: `/${user}` };
  }

  const repo = segments[0];

  if (segments.length === 1) {
    return { user, repo, currentPath: `/${user}/${repo}` };
  }

  // Parse the remaining segments after repo
  const { ref, path, tab } = parseSegmentsAfterRepo(
    segments.slice(1),
    branchNames
  );

  // Build currentPath (used for navigation)
  const currentPath = buildCurrentPath(user, repo, ref, path, tab);

  return { user, repo, ref, path, tab, currentPath };
}

/**
 * Parses segments that come after the repo name in the URL
 */
function parseSegmentsAfterRepo(
  segments: string[],
  branchNames: string[]
): { ref?: string; path?: string; tab?: string } {
  // Handle /tree/ prefix: /user/repo/tree/branch/...
  if (segments[0] === "tree" && segments.length > 1) {
    const afterTree = segments.slice(1);
    return parseRefAndPath(afterTree, branchNames);
  }

  // Handle tab paths: /user/repo/tab
  if (TAB_PATHS.includes(segments[0] as typeof TAB_PATHS[number])) {
    const tab = segments[0];
    const pathParts = segments.slice(1);
    const { tab: nestedTab, pathParts: cleanPath } = extractTabFromPath(pathParts);

    return {
      tab: nestedTab || tab,
      path: cleanPath.length > 0 ? cleanPath.join('/') : undefined
    };
  }

  // Default: treat as branch/path: /user/repo/branch/...
  return parseRefAndPath(segments, branchNames);
}

/**
 * Parses ref (branch) and path from segments
 */
function parseRefAndPath(
  segments: string[],
  branchNames: string[]
): { ref?: string; path?: string; tab?: string } {
  const useEnhancedParsing = branchNames.length > 0;

  if (useEnhancedParsing) {
    const { branch, path: branchPath } = parseBranchAndPath(segments, branchNames);
    const pathParts = branchPath ? branchPath.split('/') : [];
    const { tab, pathParts: cleanPath } = extractTabFromPath(pathParts);

    return {
      ref: branch,
      path: cleanPath.length > 0 ? cleanPath.join('/') : undefined,
      tab
    };
  }

  // Simple parsing (no branch name knowledge)
  const ref = decodeURIComponent(segments[0]);
  const pathParts = segments.slice(1);
  const { tab, pathParts: cleanPath } = extractTabFromPath(pathParts);

  return {
    ref,
    path: cleanPath.length > 0 ? cleanPath.join('/') : undefined,
    tab
  };
}

/**
 * Extracts tab from path segments and returns clean path
 */
function extractTabFromPath(pathParts: string[]): {
  tab?: string;
  pathParts: string[];
} {
  const tabIndex = pathParts.findIndex(part =>
    TAB_PATHS.includes(part as typeof TAB_PATHS[number])
  );

  if (tabIndex === -1) {
    return { pathParts };
  }

  return {
    tab: pathParts[tabIndex],
    pathParts: [
      ...pathParts.slice(0, tabIndex),
      ...pathParts.slice(tabIndex + 1)
    ]
  };
}

/**
 * Builds the current path for navigation
 */
function buildCurrentPath(
  user: string,
  repo: string,
  ref?: string,
  path?: string,
  tab?: string
): string {
  const parts = [user, repo];

  if (ref) parts.push(ref);
  if (path) parts.push(path);
  if (tab) parts.push(tab);

  return '/' + parts.join('/');
}

/**
 * Type guard for TRPC error objects
 */
export interface TRPCError {
  message: string;
}

export function isTRPCError(err: unknown): err is TRPCError {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string';
}

export function parseRepoPathWithBranches(
  params: ParseRepoPathParams,
  branchNames: string[] = []
): ParseRepoPathResult {
  const result = parseRepoPath(params, branchNames);
  
  if (result.ref) {
    const encodedRef = encodeURIComponent(result.ref);
    const pathPart = result.path ? `/${result.path}` : '';
    result.currentPath = `/${result.user}/${result.repo}/tree/${encodedRef}${pathPart}`;
  }
  
  return result;
}
