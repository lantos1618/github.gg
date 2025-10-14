import ScorecardClientView from './ScorecardClientView';
import AISlopClientView from './AISlopClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import PRListClientView from './PRListClientView';
import PRDetailClientView from './PRDetailClientView';
import IssueListClientView from './IssueListClientView';
import IssueDetailClientView from './IssueDetailClientView';
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

import { DeveloperProfile } from '@/components/profile';

function UserClientView({ user }: { user: string }) {
  return <DeveloperProfile username={user} />;
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

  // Handle pulls routes
  if (rest.length >= 2 && rest[1] === 'pulls') {
    if (rest.length === 2) {
      // /user/repo/pulls - show all PRs
      return <PRListClientView user={user} repo={repo} />;
    } else if (rest.length === 3) {
      // /user/repo/pulls/123 - show specific PR
      const prNumber = parseInt(rest[2], 10);
      if (!isNaN(prNumber)) {
        return <PRDetailClientView user={user} repo={repo} number={prNumber} />;
      }
    }
  }

  // Handle issues routes
  if (rest.length >= 2 && rest[1] === 'issues') {
    if (rest.length === 2) {
      // /user/repo/issues - show all issues
      return <IssueListClientView user={user} repo={repo} />;
    } else if (rest.length === 3) {
      // /user/repo/issues/123 - show specific issue
      const issueNumber = parseInt(rest[2], 10);
      if (!isNaN(issueNumber)) {
        return <IssueDetailClientView user={user} repo={repo} number={issueNumber} />;
      }
    }
  }

  if (tab === 'scorecard' || currentPath.endsWith('/scorecard')) {
    return (
      <ScorecardClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  if (tab === 'ai-slop' || currentPath.endsWith('/ai-slop')) {
    return (
      <AISlopClientView user={user} repo={repo} refName={ref} path={path} />
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