import ScorecardClientView from './ScorecardClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import { notFound } from 'next/navigation';
import { parseRepoPath, parseRepoPathWithBranches } from '@/lib/utils';
import { createGitHubServiceFromSession } from '@/lib/github';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface PageProps {
  params: Promise<{
    user: string;
    params?: string[];
  }>;
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
  const awaitedParams = await params;
  const { user, params: rest = [] } = awaitedParams;
  
  if (!user) return notFound();
  if (!rest || rest.length === 0) return <UserClientView user={user} />;
  
  const repo = rest[0];
  if (!repo) return <UserClientView user={user} />;

  // Try to get branch names for enhanced parsing
  let branchNames: string[] = [];
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList } as Request);
    const githubService = await createGitHubServiceFromSession(session);
    branchNames = await githubService.getBranches(user, repo);
  } catch (error) {
    console.warn('Failed to fetch branch names for enhanced parsing:', error);
    // Fall back to basic parsing
  }

  // Use enhanced parsing if we have branch names, otherwise fall back to basic parsing
  const parsed = branchNames.length > 0 
    ? parseRepoPathWithBranches(awaitedParams, branchNames)
    : parseRepoPath(awaitedParams);
    
  const { ref, path, tab, currentPath } = parsed;

  if (tab === 'scorecard' || currentPath.endsWith('/scorecard')) {
    return (
      <ScorecardClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  if (tab === 'diagram' || currentPath.endsWith('/diagram')) {
    return (
      <DiagramClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  return (
    <RepoClientView user={user} repo={repo} refName={ref} path={path} />
  );
}