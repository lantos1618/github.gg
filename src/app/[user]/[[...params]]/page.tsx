import { Suspense } from 'react';
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
  email?: string | null;
}

import { DeveloperProfile } from '@/components/profile';

function UserClientView({ user, initialProfile }: { user: string, initialProfile?: SerializableInitialProfileData }) {
  return <DeveloperProfile username={user} initialData={initialProfile} />;
}

function ProfileShell({ username }: { username: string }) {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-[900px] mx-auto space-y-8">
        <div className="flex gap-6 sm:gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://avatars.githubusercontent.com/${username}`}
            alt={username}
            className="rounded-full h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 border-2 border-[#ddd]"
          />
          <div className="min-w-0 pt-2">
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[31px] font-semibold text-[#111] hover:text-[#666] transition-colors leading-tight"
            >
              {username}
            </a>
            <div className="mt-1">
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />
            </div>
            <div className="mt-2 space-y-1">
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-40" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-28" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          <div className="xl:col-span-8 space-y-8">
            <div className="space-y-3">
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-5/6" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-4/6" />
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-md bg-gray-200 h-5 w-20" />
              ))}
            </div>
          </div>
          <div className="xl:col-span-4 space-y-8 min-h-[500px]">
            <div className="animate-pulse rounded-md bg-gray-200 h-[180px] w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-[140px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

async function ProfileLoader({ user }: { user: string }) {
  const data = await getProfileData(user);
  const initialProfile: SerializableInitialProfileData = {
    profile: data.profile,
    cached: data.cached,
    stale: data.stale,
    lastUpdated: data.lastUpdated?.toISOString() ?? null,
    email: data.email,
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
    return (
      <Suspense fallback={<ProfileShell username={user} />}>
        <ProfileLoader user={user} />
      </Suspense>
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

  if (tab === 'scorecard' || tab === 'ai-slop' || tab === 'security') {
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
