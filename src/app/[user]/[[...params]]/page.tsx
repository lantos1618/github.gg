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
  const [repo, ref, ...pathParts] = rest;
  const path = pathParts ? pathParts.join('/') : undefined;
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