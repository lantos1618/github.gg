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
import { getProfileData } from '@/lib/profile/service';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';
import { buildCanonicalUrl, isInvalidTab } from '@/lib/utils/seo';

// Force dynamic rendering to ensure fresh profile data on every request
// This prevents Next.js from caching SSR responses that may have stale profile data
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    user: string;
    params?: string[];
  }>;
}

interface SerializableInitialProfileData {
  profile: DeveloperProfileType | null;
  cached: boolean;
  stale: boolean;
  lastUpdated: string | null;
}

import { DeveloperProfile } from '@/components/profile';

function UserClientView({ user, initialProfile }: { user: string, initialProfile?: SerializableInitialProfileData }) {
  return <DeveloperProfile username={user} initialData={initialProfile} />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const awaitedParams = await params;
  const { user, params: rest = [] } = awaitedParams;

  if (!user) return {};

  // Try to get branch names for enhanced parsing
  let branchNames: string[] = [];
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList } as Request);
    const githubService = await createGitHubServiceFromSession(session);
    if (rest && rest.length > 0) {
      branchNames = await githubService.getBranches(user, rest[0]);
    }
  } catch (error) {
    // Silently fail - we'll use basic canonical logic
  }

  // Parse the path to determine if it's a coming soon page
  const parsed = parseRepoPath(awaitedParams, branchNames);
  const { tab } = parsed;

  // Validate tab - invalid tabs should return 404
  if (isInvalidTab(tab)) {
    return {};
  }

  // Coming soon features - should not be indexed
  const COMING_SOON_FEATURES = ['refactor', 'dependencies', 'architecture', 'components', 'data-flow', 'automations'];
  const isComingSoon = tab && COMING_SOON_FEATURES.includes(tab);

  // Build canonical URL - normalize by removing 'tree/' prefix
  // For default branch paths, canonicalize to the simpler form
  let canonicalPath = `/${user}`;
  if (rest && rest.length > 0) {
    // Filter out 'tree' from the path segments
    const filteredParams = rest.filter(p => p !== 'tree');
    if (filteredParams.length > 0) {
      canonicalPath += `/${filteredParams.join('/')}`;
    }
  }

  const { profile } = await getProfileData(user);

  const title = profile ? `${user} | GitHub.gg Profile` : `${user} - GitHub Developer Analysis`;
  const description = profile?.summary 
    ? `${profile.summary.slice(0, 150)}...` 
    : `Generate an AI-powered analysis to uncover insights about ${user}. View coding style, skills, and top repositories.`;

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(canonicalPath),
    },
    openGraph: {
      title,
      description,
      images: [{ url: `https://avatars.githubusercontent.com/${user}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`https://avatars.githubusercontent.com/${user}`],
    },
    robots: isComingSoon ? 'noindex, nofollow' : undefined,
  };
}

export default async function Page({ params }: PageProps) {
  const awaitedParams = await params;
  const { user, params: rest = [] } = awaitedParams;
  
  if (!user) return notFound();

  // Fetch initial profile data for SSR
  const data = await getProfileData(user);
  const initialProfile: SerializableInitialProfileData = {
    ...data,
    lastUpdated: data.lastUpdated?.toISOString() ?? null,
  };

  if (!rest || rest.length === 0) return <UserClientView user={user} initialProfile={initialProfile} />;
  
  const repo = rest[0];
  if (!repo) return <UserClientView user={user} initialProfile={initialProfile} />;

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

  // Return 404 for invalid tabs (actions, security, settings, etc.)
  if (isInvalidTab(tab)) {
    notFound();
  }

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
    'refactor': {
      title: 'Refactor Suggestions',
      description: 'AI-powered refactoring suggestions and code improvement recommendations coming soon.',
      iconName: 'Wrench' as const,
      iconColor: 'text-amber-600',
    },
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
