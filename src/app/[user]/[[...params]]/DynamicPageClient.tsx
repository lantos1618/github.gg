"use client";

import { useParams } from 'next/navigation';
import ScorecardClientView from './ScorecardClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';



export default function DynamicPageClient() {
  const routeParams = useParams<{ user: string; repo: string; ref?: string; path?: string }>();
  const { user, repo, ref, path } = routeParams;

  if (!user || !repo) {
    return <div>Invalid repository path</div>;
  }

  // Build the current path to determine which view to show
  const currentPath = `/${user}/${repo}${ref ? `/${ref}` : ''}${path ? `/${path}` : ''}`;

  // Check if this is a specific route that should show a different view
  // there is a bug where projects might actually have the ending /scorecard or /diagram we should quickly just test for that
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

  // Default to the main repo view
  return (
    <RepoClientView 
      user={user} 
      repo={repo} 
      refName={ref} 
      path={path} 
      currentPath={currentPath}
      params={{ user, repo: [repo] }}
    />
  );
} 