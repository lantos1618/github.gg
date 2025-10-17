import ScorecardClientView from './ScorecardClientView';
import AISlopClientView from './AISlopClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import PRListClientView from './PRListClientView';
import PRDetailClientView from './PRDetailClientView';
import IssueListClientView from './IssueListClientView';
import IssueDetailClientView from './IssueDetailClientView';
import ComingSoon from '@/components/ComingSoon';
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

  const { ref, path, tab } = parsed;

  // Handle pulls routes
  if (tab === 'pulls') {
    // Check if there's a PR number in the path
    if (path && /^\d+$/.test(path)) {
      const prNumber = parseInt(path, 10);
      return <PRDetailClientView user={user} repo={repo} number={prNumber} />;
    }
    // Otherwise show all PRs
    return <PRListClientView user={user} repo={repo} />;
  }

  // Handle issues routes
  if (tab === 'issues') {
    // Check if there's an issue number in the path
    if (path && /^\d+$/.test(path)) {
      const issueNumber = parseInt(path, 10);
      return <IssueDetailClientView user={user} repo={repo} number={issueNumber} />;
    }
    // Otherwise show all issues
    return <IssueListClientView user={user} repo={repo} />;
  }

  if (tab === 'scorecard') {
    return (
      <ScorecardClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  if (tab === 'ai-slop') {
    return (
      <AISlopClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  if (tab === 'diagram') {
    return (
      <DiagramClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  if (tab === 'dependencies') {
    return (
      <ComingSoon
        user={user}
        repo={repo}
        refName={ref}
        path={path}
        title="Dependencies"
        description="Dependency analysis and visualization coming soon."
        iconName="GitBranch"
        iconColor="text-blue-600"
        showContributeSection={true}
      />
    );
  }

  if (tab === 'architecture') {
    return (
      <ComingSoon
        user={user}
        repo={repo}
        refName={ref}
        path={path}
        title="Architecture"
        description="Architecture diagrams and analysis coming soon."
        iconName="Box"
        iconColor="text-purple-600"
        showContributeSection={true}
      />
    );
  }

  if (tab === 'components') {
    return (
      <ComingSoon
        user={user}
        repo={repo}
        refName={ref}
        path={path}
        title="Components"
        description="Component hierarchy and relationships coming soon."
        iconName="Boxes"
        iconColor="text-green-600"
        showContributeSection={true}
      />
    );
  }

  if (tab === 'data-flow') {
    return (
      <ComingSoon
        user={user}
        repo={repo}
        refName={ref}
        path={path}
        title="Data Flow"
        description="Data flow analysis and visualization coming soon."
        iconName="Workflow"
        iconColor="text-orange-600"
        showContributeSection={true}
      />
    );
  }

  if (tab === 'automations') {
    return (
      <ComingSoon
        user={user}
        repo={repo}
        refName={ref}
        path={path}
        title="Automations"
        description="Automation workflows and CI/CD analysis coming soon."
        iconName="Cog"
        iconColor="text-gray-600"
        showContributeSection={true}
      />
    );
  }

  return (
    <RepoClientView user={user} repo={repo} refName={ref} path={path} />
  );
}