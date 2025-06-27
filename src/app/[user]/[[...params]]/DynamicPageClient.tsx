"use client";

import { useParams } from 'next/navigation';
import ScorecardClientView from './ScorecardClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import { getTabPaths } from '@/lib/repoTabs';



export default function DynamicPageClient() {
  const params = useParams();
  // params: { user, params: [repo, ...rest] }
  // But in app router, useParams returns a flat object or array depending on catch-all
  // We'll assume: { user, params: [repo, ...rest] } or { user, repo, ...rest }
  // We'll handle both
  let user: string | undefined;
  let repo: string | undefined;
  let ref: string | undefined;
  let path: string | undefined;
  let tab: string | undefined;
  const TAB_PATHS = getTabPaths();

  if ('user' in params && 'params' in params && Array.isArray(params.params)) {
    user = Array.isArray(params.user) ? params.user[0] : params.user;
    const rest = params.params;
    if (rest.length > 0) {
      repo = Array.isArray(rest[0]) ? rest[0][0] : rest[0];
      if (rest.length > 1) {
        const lastSegment = rest[rest.length - 1];
        const isTabPath = TAB_PATHS.includes(lastSegment);
        if (isTabPath) {
          tab = lastSegment;
          rest.pop();
        }
        if (rest[1] === 'tree' && rest.length > 2) {
          ref = rest[2];
          path = rest.length > 3 ? rest.slice(3).join('/') : undefined;
        } else if (rest.length > 1) {
          ref = rest[1];
          path = rest.length > 2 ? rest.slice(2).join('/') : undefined;
        }
      }
    }
  } else if ('user' in params && 'repo' in params) {
    user = Array.isArray(params.user) ? params.user[0] : params.user;
    repo = Array.isArray(params.repo) ? params.repo[0] : params.repo;
    ref = Array.isArray(params.ref) ? params.ref[0] : params.ref;
    path = Array.isArray(params.path) ? params.path.join('/') : params.path;
  }

  if (!user || !repo) {
    return <div>Invalid repository path</div>;
  }

  // Build the current path to determine which view to show
  let currentPath = `/${user}/${repo}`;
  if (ref) currentPath += `/tree/${ref}`;
  if (path) currentPath += `/${path}`;
  if (tab) currentPath += `/${tab}`;

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