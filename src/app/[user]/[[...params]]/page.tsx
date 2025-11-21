import AnalysisClientView from './AnalysisClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import PRListClientView from './PRListClientView';
import PRDetailClientView from './PRDetailClientView';
import IssueListClientView from './IssueListClientView';
import IssueDetailClientView from './IssueDetailClientView';
import ComingSoon from '@/components/ComingSoon';
import { notFound } from 'next/navigation';
import { parseRepoPath } from '@/lib/utils';
import { createGitHubServiceFromSession } from '@/lib/github';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { Metadata } from 'next';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const awaitedParams = await params;
  const { user, params: rest = [] } = awaitedParams;

  if (!user) return {};

  // Build canonical URL - remove 'tree/' prefix if present
  let canonicalPath = `/${user}`;
  if (rest && rest.length > 0) {
    // Filter out 'tree' from the path segments
    const filteredParams = rest.filter(p => p !== 'tree');
    if (filteredParams.length > 0) {
      canonicalPath += `/${filteredParams.join('/')}`;
    }
  }

  return {
    alternates: {
      canonical: `https://github.gg${canonicalPath}`,
    },
  };
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

  // Use parseRepoPath with branch names for enhanced parsing (if available)
  const parsed = parseRepoPath(awaitedParams, branchNames);

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

  if (tab === 'scorecard' || tab === 'ai-slop') {
    return <AnalysisClientView user={user} repo={repo} refName={ref} path={path} analysisType={tab} />;
  }

  if (tab === 'diagram') {
    return (
      <DiagramClientView user={user} repo={repo} refName={ref} path={path} />
    );
  }

  // Coming Soon features configuration
  const COMING_SOON_FEATURES = {
    'dependencies': {
      title: 'Dependencies',
      description: 'Dependency analysis and visualization coming soon.',
      iconName: 'GitBranch' as const,
      iconColor: 'text-blue-600',
    },
    'architecture': {
      title: 'Architecture',
      description: 'Architecture diagrams and analysis coming soon.',
      iconName: 'Box' as const,
      iconColor: 'text-purple-600',
    },
    'components': {
      title: 'Components',
      description: 'Component hierarchy and relationships coming soon.',
      iconName: 'Boxes' as const,
      iconColor: 'text-green-600',
    },
    'data-flow': {
      title: 'Data Flow',
      description: 'Data flow analysis and visualization coming soon.',
      iconName: 'Workflow' as const,
      iconColor: 'text-orange-600',
    },
    'automations': {
      title: 'Automations',
      description: 'Automation workflows and CI/CD analysis coming soon.',
      iconName: 'Cog' as const,
      iconColor: 'text-gray-600',
    },
  } as const;

  const comingSoonConfig = COMING_SOON_FEATURES[tab as keyof typeof COMING_SOON_FEATURES];
  if (comingSoonConfig) {
    return (
      <ComingSoon
        user={user}
        repo={repo}
        refName={ref}
        path={path}
        {...comingSoonConfig}
        showContributeSection={true}
      />
    );
  }

  return (
    <RepoClientView user={user} repo={repo} refName={ref} path={path} />
  );
}