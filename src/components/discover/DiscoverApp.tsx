"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { TextButton } from '@/components/ui/text-button';
import { NetworkGraph, type NetworkUser, type EdgeFilter } from '@/components/admin/NetworkGraph';
import { SemanticMap, type SemanticMapPoint } from '@/components/discover/SemanticMap';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionHint } from '@/lib/session-context';
import { useAuth } from '@/lib/auth/client';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import { Skeleton } from 'boneyard-js/react';
import { Github, Lock } from 'lucide-react';

interface DiscoverAppProps {
  /** Wrap with PageWidthContainer + min-h-screen padding. Off when embedded inside another page (e.g. /hire). */
  standalone?: boolean;
}

export default function DiscoverApp({ standalone = false }: DiscoverAppProps = {}) {
  if (!standalone) return <NetworkExplorer showHeading={false} />;
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer>
        <NetworkExplorer showHeading={true} />
      </PageWidthContainer>
    </div>
  );
}

type DiscoverMode = 'network' | 'explore';

function NetworkExplorer({ showHeading = true }: { showHeading?: boolean }) {
  const hint = useSessionHint();
  const { isSignedIn, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Pre-fill from ?seed=<username> so the "Find similar" CTA on /hire/<u>
  // (which routes here through OAuth) lands the user on a populated graph
  // instead of an empty input.
  const initialSeed = (searchParams.get('seed') || '').replace(/^@/, '');
  const [seedUsername, setSeedUsername] = useState(initialSeed);
  const [activeUsername, setActiveUsername] = useState(initialSeed);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  // Default to 'explore' so every visitor — signed in or not — lands on the
  // semantic map of every analyzed dev first. The map IS the value prop;
  // showing it before any input keeps the funnel value-first. `?seed=<u>`
  // still forces network mode (the "Find similar" CTA round-trips through
  // OAuth and lands here).
  const [discoverMode, setDiscoverMode] = useState<DiscoverMode>(initialSeed ? 'network' : 'explore');
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>({ following: true, followers: true, semantic: true });
  const trpcUtils = trpc.useUtils();

  const toggleFilter = (key: keyof EdgeFilter) => setEdgeFilter(prev => ({ ...prev, [key]: !prev[key] }));

  // --- Data queries (server does all enrichment + caching) ---
  const { data: network, isLoading: networkLoading } = trpc.discover.getUnifiedNetwork.useQuery(
    { username: activeUsername, limit: 50 },
    { enabled: !!activeUsername && discoverMode === 'network' }
  );

  // Lazy enrichment — separate call so getUnifiedNetwork returns fast
  const networkUsernames = useMemo(() => network?.users.map(u => u.username) || [], [network]);
  const isAlreadyEnriched = network?.users?.some(u => u.followers > 0) ?? false;
  const { data: enrichment } = trpc.discover.enrichUsers.useQuery(
    { seed: activeUsername, usernames: networkUsernames },
    { enabled: networkUsernames.length > 0 && !isAlreadyEnriched && discoverMode === 'network' }
  );

  // Merge enrichment into network data
  const enrichedNetwork = useMemo(() => {
    if (!network) return null;
    if (!enrichment) return network;
    return {
      ...network,
      users: network.users.map(u => {
        const d = enrichment[u.username.toLowerCase()];
        return d ? { ...u, name: d.name, bio: d.bio, followers: d.followers, following: d.following, publicRepos: d.publicRepos } : u;
      }).sort((a, b) => b.followers - a.followers),
    };
  }, [network, enrichment]);

  const { data: similarData } = trpc.discover.getSimilarDevelopers.useQuery(
    { username: activeUsername, limit: 15 },
    { enabled: !!activeUsername && discoverMode === 'network' }
  );

  const { data: allProfiles, isLoading: allProfilesLoading } = trpc.discover.getAllGGProfileNodes.useQuery(
    { limit: 200 },
    { enabled: discoverMode === 'explore', staleTime: 5 * 60 * 1000 }
  );

  const handleExpandNode = useCallback(async (username: string) => {
    try {
      const result = await trpcUtils.discover.getNetworkUsers.fetch({ username, type: 'following', limit: 30 });
      return result.users;
    } catch {
      return null;
    }
  }, [trpcUtils]);

  const handleSearch = useCallback(() => {
    if (seedUsername.trim()) {
      setActiveUsername(seedUsername.trim().replace(/^@/, ''));
      setSelectedUsers(new Set());
      setDiscoverMode('network');
    }
  }, [seedUsername]);

  // Pre-fill the seed input with the signed-in user's GH handle so flipping
  // to "My Network" is one click — but DON'T auto-switch modes. Landing must
  // stay on the global map; the map is the value-first surface.
  useEffect(() => {
    if (hint?.githubUsername && !seedUsername) {
      setSeedUsername(hint.githubUsername);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint?.githubUsername]);

  // --- Derived data ---
  const semanticUsers: NetworkUser[] = useMemo(() =>
    (similarData?.users || []).map(u => ({
      username: u.username, avatar: u.avatar, name: null, bio: u.summary,
      followers: 0, publicRepos: 0, hasGGProfile: true,
      similarity: u.similarity, archetype: u.archetype, score: u.score, topSkills: u.topSkills,
    })),
    [similarData]
  );

  const currentNetwork = enrichedNetwork && enrichedNetwork.seed.toLowerCase() === activeUsername.toLowerCase() ? enrichedNetwork : null;
  const isLoading = discoverMode === 'network'
    ? (!!activeUsername && networkLoading)
    : (allProfilesLoading && !allProfiles);

  const archetypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of allProfiles || []) counts.set(u.archetype || 'Unknown', (counts.get(u.archetype || 'Unknown') || 0) + 1);
    return counts;
  }, [allProfiles]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        {showHeading ? (
          <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">Discover</h1>
        ) : (
          <span /> /* keep flex spacing — controls stay right-aligned */
        )}
        <div className="flex items-end gap-6 flex-shrink-0">
          {discoverMode === 'network' && (
            <input
              value={seedUsername}
              onChange={(e) => setSeedUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. torvalds, antfu"
              className="w-48 border-0 border-b-2 border-[#ddd] bg-transparent text-base text-[#111] placeholder:text-[#ccc] hover:border-[#888] focus:border-[#111] focus:text-[#000] focus:placeholder:text-[#999] focus:outline-none focus:ring-0 transition-colors pb-1"
            />
          )}
          <TextButton onClick={() => setDiscoverMode('network')} active={discoverMode === 'network'} size="base" className="pb-1 font-medium">
            My Network
          </TextButton>
          <TextButton onClick={() => setDiscoverMode('explore')} active={discoverMode === 'explore'} size="base" className="pb-1 font-medium">
            Explore All
          </TextButton>
        </div>
      </div>

      <Skeleton
        name="discover-content"
        loading={isLoading}
        fallback={
          <div>
            <div className="animate-pulse rounded-md bg-gray-200 h-4 w-48 mb-3" />
            <div className="animate-pulse rounded-lg bg-gray-100 w-full" style={{ height: 500 }} />
          </div>
        }
        fixture={
          <div>
            <div className="h-4 w-48 bg-gray-200 rounded mb-3" />
            <div className="rounded-lg bg-gray-100 w-full flex items-center justify-center" style={{ height: 500 }}>
              <div className="space-y-4 text-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                    <div className="h-3 bg-gray-200 rounded" style={{ width: `${60 + (i % 3) * 20}px` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        {discoverMode === 'network' && currentNetwork && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-base text-[#888]">
                {currentNetwork.users.length} connections of <strong className="text-[#111]">@{currentNetwork.seed}</strong>
              </span>
              <div className="flex gap-1.5">
                <button onClick={() => toggleFilter('following')} className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${edgeFilter.following ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#999]'}`}>
                  Following
                </button>
                <button onClick={() => toggleFilter('followers')} className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${edgeFilter.followers ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#999]'}`}>
                  Followers
                </button>
                {semanticUsers.length > 0 && (
                  <button onClick={() => toggleFilter('semantic')} className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${edgeFilter.semantic ? 'bg-[#8b5cf6] text-white' : 'bg-[#f0f0f0] text-[#999]'}`}>
                    Similar
                  </button>
                )}
              </div>
            </div>

            <NetworkGraph
              users={currentNetwork.users}
              seed={currentNetwork.seed}
              seedAvatar={currentNetwork.seedAvatar}
              semanticUsers={semanticUsers}
              edgeFilter={edgeFilter}
              onExpandNode={handleExpandNode}
              onSelectionChange={setSelectedUsers}
            />
          </>
        )}

        {discoverMode === 'network' && !currentNetwork && !isLoading && !isSignedIn && (
          // Signed-out: network queries are protected, so either no seed or a
          // seed query that silently 401s lands here. Show the sign-in gate.
          <div className="py-16 text-center">
            <div className="max-w-sm mx-auto">
              <div className="mx-auto w-10 h-10 rounded-full bg-[#111] flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-[#111] mb-1">
                {activeUsername ? `Sign in to see @${activeUsername}'s network` : 'Sign in to explore networks'}
              </h3>
              <p className="text-sm text-[#888] mb-4">
                Network mode reads GitHub follow graphs. Browse the public semantic map without signing in.
              </p>
              <button
                onClick={() => signIn(`/hire${activeUsername ? `?seed=${encodeURIComponent(activeUsername)}` : ''}`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white rounded font-medium text-sm"
              >
                <Github className="w-4 h-4" />
                Sign in with GitHub
              </button>
              <button
                onClick={() => setDiscoverMode('explore')}
                className="block mx-auto mt-3 text-xs text-[#666] hover:text-[#111] underline-offset-4 hover:underline"
              >
                Browse the map instead
              </button>
            </div>
          </div>
        )}

        {discoverMode === 'network' && !currentNetwork && !isLoading && isSignedIn && !activeUsername && (
          <div className="py-16 text-center">
            <p className="text-base text-[#aaa]">Enter a GitHub username above to explore their network.</p>
          </div>
        )}

        {discoverMode === 'explore' && allProfiles && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-base text-[#888]">
                <strong className="text-[#111]">{allProfiles.length}</strong> analyzed developers
                {archetypeCounts.size > 0 && (
                  <span className="ml-3 text-[13px]">
                    {Array.from(archetypeCounts.entries())
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 4)
                      .map(([arch, count]) => `${count} ${arch.split(' ').slice(-1)[0]}`)
                      .join(' · ')}
                  </span>
                )}
              </span>
            </div>

            <SemanticMap
              points={allProfiles
                .filter(p => p.x != null && p.y != null)
                .map((p): SemanticMapPoint => ({
                  username: p.username,
                  x: p.x as number,
                  y: p.y as number,
                  archetype: p.archetype,
                  confidence: p.confidence,
                  topSkills: p.topSkills,
                  avatar: p.avatar,
                }))}
              height={600}
              onClickNode={(username) => router.push(`/hire/${username}`)}
            />
          </>
        )}
      </Skeleton>
    </div>
  );
}

