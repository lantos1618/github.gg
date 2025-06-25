import path from "path"
import InsightsClientView from './InsightsClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import { notFound } from 'next/navigation';

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
  
  if (rest.length > 0) {
    repo = rest[0];
    
    if (rest.length > 1) {
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
  
  const path = pathParts.length > 0 ? pathParts.join('/') : undefined;
  const currentPath = `/${[user, repo, ref, ...pathParts].filter(Boolean).join('/')}`;

  if (!user) return notFound();
  if (!repo) return <UserClientView user={user} />;

  // there is a bug where porjects might actually have the ending /insights or /diagram we should quickly just test for that

  if (currentPath.endsWith('/insights')) {
    return (
      <InsightsClientView user={user} repo={repo} refName={ref} path={path} />
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