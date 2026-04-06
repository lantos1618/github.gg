import AnalysisClientView from './AnalysisClientView';
import RepoClientView from './RepoClientView';
import DiagramClientView from './DiagramClientView';
import PRListClientView from './PRListClientView';
import PRDetailClientView from './PRDetailClientView';
import IssueListClientView from './IssueListClientView';
import IssueDetailClientView from './IssueDetailClientView';

import { notFound } from 'next/navigation';
import { parseRepoPath } from '@/lib/utils';
import { createGitHubServiceForRepo } from '@/lib/github';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getProfileData } from '@/lib/profile/service';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';
import { buildCanonicalUrl, isInvalidTab } from '@/lib/utils/seo';
import { ProfileJsonLd } from '@/components/seo/ProfileJsonLd';
import { RepoJsonLd } from '@/components/seo/RepoJsonLd';
import { createCaller } from '@/lib/trpc/server';

// Use ISR with 5-minute revalidation to cache profile pages and reduce DB load
export const revalidate = 300;

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

  // Only fetch branches when there are 3+ path segments that could be ambiguous
  let branchNames: string[] = [];
  if (rest && rest.length >= 3) {
    try {
      const headersList = await headers();
      const session = await auth.api.getSession({ headers: headersList } as Request);
      const githubService = await createGitHubServiceForRepo(user, rest[0], session);
      branchNames = await githubService.getBranches(user, rest[0]);
    } catch (error) {
      // Silently fail - we'll use basic canonical logic
    }
  }

  // Parse the path to determine if it's a coming soon page
  const parsed = parseRepoPath(awaitedParams, branchNames);
  const { tab } = parsed;

  // Validate tab - invalid tabs should return 404
  if (isInvalidTab(tab)) {
    return {};
  }

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

  const isProfileRoute = !rest || rest.length === 0;
  // Only fetch profile data for metadata when on a profile route
  const profile = isProfileRoute ? (await getProfileData(user)).profile : null;

  const isRepoRoute = rest && rest.length > 0;
  const repoName = isRepoRoute ? rest[0] : null;
  const title = isRepoRoute
    ? `${user}/${repoName} - Code Analysis | GG`
    : profile
      ? `${user} | GitHub.gg Profile`
      : `${user} - GitHub Developer Analysis`;
  const description = isRepoRoute
    ? `Explore ${user}/${repoName} with AI-powered code quality scores, architecture diagrams, and generated documentation.`
    : profile?.summary
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
  };
}

export default async function Page({ params }: PageProps) {
  const awaitedParams = await params;
  const { user, params: rest = [] } = awaitedParams;
  
  if (!user) return notFound();

  const isProfileRoute = !rest || rest.length === 0 || !rest[0];

  if (isProfileRoute) {
    // Only fetch profile data for profile routes (not repo pages)
    const data = await getProfileData(user);
    const initialProfile: SerializableInitialProfileData = {
      ...data,
      lastUpdated: data.lastUpdated?.toISOString() ?? null,
    };
    return (
      <>
        <ProfileJsonLd
          name={user}
          username={user}
          avatarUrl={`https://avatars.githubusercontent.com/${user}`}
          bio={initialProfile.profile?.summary}
        />
        <UserClientView user={user} initialProfile={initialProfile} />
      </>
    );
  }

  const repo = rest[0];

  // Only fetch branches when there are 3+ path segments that could be ambiguous
  // e.g., /user/repo/somebranch/path — not for simple /user/repo or /user/repo/tab
  let branchNames: string[] = [];
  if (rest.length >= 3) {
    try {
      const headersList = await headers();
      const session = await auth.api.getSession({ headers: headersList } as Request);
      const githubService = await createGitHubServiceForRepo(user, repo, session);
      branchNames = await githubService.getBranches(user, repo);
    } catch (error) {
      console.warn('Failed to fetch branch names for enhanced parsing:', error);
      // Fall back to basic parsing
    }
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
    let initialDiagram: any = null;
    try {
      const caller = await createCaller();
      initialDiagram = await caller.diagram.publicGetDiagram({ user, repo, ref: ref || 'main', diagramType: 'flowchart' });
    } catch {}
    return (
      <DiagramClientView user={user} repo={repo} refName={ref} path={path} initialDiagram={initialDiagram} />
    );
  }

  return (
    <>
      <RepoJsonLd name={repo} owner={user} />
      <RepoClientView user={user} repo={repo} refName={ref} path={path} />
    </>
  );
}
