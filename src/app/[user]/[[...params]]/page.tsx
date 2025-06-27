import path from "path"
import ScorecardClientView from './ScorecardClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import { notFound } from 'next/navigation';
import { getTabPaths } from '@/lib/repoTabs';

interface PageProps {
  params: {
    user: string;
    params?: string[];
  };
}

function UserClientView({ user }: { user: string }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h1>User Profile</h1>
      <p>This is a placeholder for the user profile view for <b>{user}</b>.</p>
    </div>
  );
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const { user, params: rest = [] } = resolvedParams;
  
  // Parse the path segments, handling GitHub's /tree/branch/path structure
  let repo: string | undefined;
  let ref: string | undefined;
  let pathParts: string[] = [];
  
  const TAB_PATHS = getTabPaths();

  if (rest.length > 0) {
    repo = rest[0];
    
    if (rest.length > 1) {
      // Check if the last segment is a tab path
      const lastSegment = rest[rest.length - 1];
      const isTabPath = TAB_PATHS.includes(lastSegment);
      
      if (isTabPath) {
        // If it's a tab path, don't treat any segment as ref
        // Just use the repo name and let the tab views handle the rest
        ref = undefined;
        pathParts = [];
      } else {
        // Check if the second segment is 'tree' (GitHub URL structure)
        if (rest[1] === 'tree' && rest.length > 2) {
          // Format: /user/repo/tree/branch/path
          ref = rest[2];
          pathParts = rest.slice(3);
        } else {
          // Format: /user/repo/branch/path (direct branch reference)
          ref = rest[1];
          pathParts = rest.slice(2);
        }
      }
    }
  }
  
  const path = pathParts.length > 0 ? pathParts.join('/') : undefined;
  
  // Build currentPath correctly - include the tab path if it exists
  const pathSegments = [user, repo];
  if (ref) pathSegments.push(ref);
  if (pathParts.length > 0) pathSegments.push(...pathParts);
  
  // Check if the last segment is a tab path and include it
  if (rest.length > 1) {
    const lastSegment = rest[rest.length - 1];
    if (TAB_PATHS.includes(lastSegment)) {
      pathSegments.push(lastSegment);
    }
  }
  
  const currentPath = `/${pathSegments.filter(Boolean).join('/')}`;

  if (!user) return notFound();
  if (!repo) return <UserClientView user={user} />;

  // Check for tab paths
  if (currentPath.endsWith('/scorecard')) {
    return (
      <ScorecardClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  if (currentPath.endsWith('/diagram')) {
    return (
      <DiagramClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  return (
    <RepoClientView user={user} repo={repo} refName={ref} path={path} currentPath={currentPath} params={resolvedParams} />
  );
}