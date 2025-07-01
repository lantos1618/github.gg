import ScorecardClientView from './ScorecardClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import { notFound } from 'next/navigation';
import { parseRepoPath } from '@/lib/utils';

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
  const parsed = parseRepoPath(awaitedParams);
  const { user, repo, ref, path, tab, currentPath } = parsed;

  if (!user) return notFound();
  if (!repo) return <UserClientView user={user} />;

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