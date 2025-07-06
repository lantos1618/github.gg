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
 * Parses segments after /tree/ to find the longest matching branch name
 * and returns the branch name and remaining path.
 */
export function parseBranchAndPath(segments: string[], branchNames: string[]): { branch: string; path?: string } {
  if (segments.length === 0) {
    return { branch: 'main' }; // fallback
  }

  // Try to match the longest possible prefix to a branch name
  for (let i = segments.length; i > 0; i--) {
    const candidate = segments.slice(0, i).join('/');
    if (branchNames.includes(candidate)) {
      const path = segments.slice(i).join('/') || undefined;
      return { branch: candidate, path };
    }
  }

  // Fallback: treat first segment as branch (for backward compatibility)
  const path = segments.slice(1).join('/') || undefined;
  return { branch: segments[0], path };
}

/**
 * Parses Next.js dynamic route params for a GitHub-style repo URL.
 * Returns { user, repo, ref, path, tab, currentPath }
 * 
 * Note: For accurate branch parsing with slashes, you should pass branchNames
 * to parseRepoPathWithBranches instead.
 */
export function parseRepoPath(params: { user: string; params?: string[] }) {
  const TAB_PATHS = ["scorecard", "diagram"]; // Add more if needed or import from repoTabs
  const { user, params: rest = [] } = params;
  let repo: string | undefined;
  let ref: string | undefined;
  let pathParts: string[] = [];
  let tab: string | undefined;

  if (rest.length > 0) {
    repo = rest[0];
    if (rest.length > 1) {
      const lastSegment = rest[rest.length - 1];
      const isTabPath = TAB_PATHS.includes(lastSegment);
      if (isTabPath) {
        tab = lastSegment;
        // Remove tab from path parsing
        rest.pop();
      }
      if (rest[1] === "tree" && rest.length > 2) {
        // Decode ref (branch) in case it's URL-encoded (e.g., feat%2Fthisthing)
        ref = decodeURIComponent(rest[2]);
        pathParts = rest.slice(3);
      } else if (rest.length > 1) {
        ref = decodeURIComponent(rest[1]);
        pathParts = rest.slice(2);
      }
    }
  }
  const path = pathParts.length > 0 ? pathParts.join("/") : undefined;
  // Build currentPath
  let currentPath = `/${user}`;
  if (repo) currentPath += `/${repo}`;
  if (ref) currentPath += `/tree/${ref}`;
  if (path) currentPath += `/${path}`;
  if (tab) currentPath += `/${tab}`;
  return { user, repo, ref, path, tab, currentPath };
}

/**
 * Enhanced version of parseRepoPath that uses branch names for accurate parsing
 * of branch names containing slashes.
 */
export function parseRepoPathWithBranches(
  params: { user: string; params?: string[] }, 
  branchNames: string[]
) {
  const TAB_PATHS = ["scorecard", "diagram"];
  const { user, params: rest = [] } = params;
  let repo: string | undefined;
  let ref: string | undefined;
  let pathParts: string[] = [];
  let tab: string | undefined;

  if (rest.length > 0) {
    repo = rest[0];
    if (rest.length > 1) {
      const lastSegment = rest[rest.length - 1];
      const isTabPath = TAB_PATHS.includes(lastSegment);
      if (isTabPath) {
        tab = lastSegment;
        rest.pop();
      }
      
      if (rest[1] === "tree" && rest.length > 2) {
        // Use enhanced parsing for segments after /tree/
        const segmentsAfterTree = rest.slice(2);
        const { branch, path } = parseBranchAndPath(segmentsAfterTree, branchNames);
        ref = branch;
        pathParts = path ? path.split('/') : [];
      } else if (rest.length > 1) {
        // Direct branch reference (without /tree/)
        const segmentsAfterRepo = rest.slice(1);
        const { branch, path } = parseBranchAndPath(segmentsAfterRepo, branchNames);
        ref = branch;
        pathParts = path ? path.split('/') : [];
      }
    }
  }
  
  const path = pathParts.length > 0 ? pathParts.join("/") : undefined;
  
  // Build currentPath
  let currentPath = `/${user}`;
  if (repo) currentPath += `/${repo}`;
  if (ref) currentPath += `/tree/${ref}`;
  if (path) currentPath += `/${path}`;
  if (tab) currentPath += `/${tab}`;
  
  return { user, repo, ref, path, tab, currentPath };
}
