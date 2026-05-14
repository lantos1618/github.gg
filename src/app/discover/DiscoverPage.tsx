"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';
import { TextButton } from '@/components/ui/text-button';
import { NetworkGraph, type NetworkUser, type EdgeFilter } from '@/components/admin/NetworkGraph';
import { SemanticMap, type SemanticMapPoint } from '@/components/discover/SemanticMap';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionHint } from '@/lib/session-context';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import { Skeleton } from 'boneyard-js/react';

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer>
        <NetworkExplorer />
      </PageWidthContainer>
    </div>
  );
}

type DiscoverMode = 'network' | 'explore';
type ViewMode = 'table' | 'graph' | 'map';

function ViewToggle({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void }) {
  return (
    <div className="flex gap-4">
      <TextButton onClick={() => setViewMode('table')} active={viewMode === 'table'} className="pb-1 text-xs font-semibold tracking-[1px] uppercase">
        Table
      </TextButton>
      <TextButton onClick={() => setViewMode('graph')} active={viewMode === 'graph'} className="pb-1 text-xs font-semibold tracking-[1px] uppercase">
        Graph
      </TextButton>
      <TextButton onClick={() => setViewMode('map')} active={viewMode === 'map'} className="pb-1 text-xs font-semibold tracking-[1px] uppercase">
        Map
      </TextButton>
    </div>
  );
}

function NetworkExplorer() {
  const hint = useSessionHint();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Pre-fill from ?seed=<username> so the "Find similar" CTA on /hire/<u>
  // (which routes here through OAuth) lands the user on a populated graph
  // instead of an empty input.
  const initialSeed = (searchParams.get('seed') || '').replace(/^@/, '');
  const [seedUsername, setSeedUsername] = useState(initialSeed);
  const [activeUsername, setActiveUsername] = useState(initialSeed);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [discoverMode, setDiscoverMode] = useState<DiscoverMode>('network');
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

  useEffect(() => {
    if (hint?.githubUsername && !activeUsername) {
      setSeedUsername(hint.githubUsername);
      setActiveUsername(hint.githubUsername);
      setDiscoverMode('network');
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

  const allProfileUsers: NetworkUser[] = useMemo(() =>
    (allProfiles || []).map(u => ({
      username: u.username, avatar: u.avatar, name: null, bio: u.summary,
      followers: 0, publicRepos: 0, hasGGProfile: true,
      archetype: u.archetype, score: u.score, topSkills: u.topSkills,
    })),
    [allProfiles]
  );

  const currentNetwork = enrichedNetwork && enrichedNetwork.seed.toLowerCase() === activeUsername.toLowerCase() ? enrichedNetwork : null;
  const isLoading = discoverMode === 'network'
    ? (!!activeUsername && networkLoading)
    : (allProfilesLoading && !allProfiles);

  const archetypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of allProfileUsers) counts.set(u.archetype || 'Unknown', (counts.get(u.archetype || 'Unknown') || 0) + 1);
    return counts;
  }, [allProfileUsers]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">Discover</h1>
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
            <div className="flex items-center justify-between mb-3">
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-48" />
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>
            <div className="animate-pulse rounded-lg bg-gray-100 w-full" style={{ height: 500 }} />
          </div>
        }
        fixture={
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>
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
              <div className="flex gap-4 items-center">
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
                <span className="w-px h-4 bg-[#e0e0e0]" />
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
              </div>
            </div>

            {viewMode === 'graph' ? (
              <NetworkGraph
                users={currentNetwork.users}
                seed={currentNetwork.seed}
                seedAvatar={currentNetwork.seedAvatar}
                semanticUsers={semanticUsers}
                edgeFilter={edgeFilter}
                onExpandNode={handleExpandNode}
                onSelectionChange={setSelectedUsers}
              />
            ) : (
              <NetworkTable users={currentNetwork.users} semanticUsers={semanticUsers} />
            )}
          </>
        )}

        {discoverMode === 'network' && !currentNetwork && !isLoading && !activeUsername && (
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
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            {viewMode === 'graph' ? (
              <NetworkGraph
                users={allProfileUsers}
                seed="github.gg"
                onSelectionChange={setSelectedUsers}
              />
            ) : viewMode === 'map' ? (
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
            ) : (
              <ExploreAllTable profiles={allProfiles} />
            )}
          </>
        )}
      </Skeleton>
    </div>
  );
}

function NetworkTable({ users, semanticUsers }: { users: NetworkUser[]; semanticUsers: NetworkUser[] }) {
  return (
    <table className="w-full text-base border-collapse">
      <thead>
        <tr className="border-b border-[#ddd]">
          <td className="py-2 text-xs text-[#999] font-semibold">Developer</td>
          <td className="py-2 text-xs text-[#999] font-semibold hidden sm:table-cell">Bio</td>
          <td className="py-2 text-xs text-[#999] font-semibold text-center">Relation</td>
          <td className="py-2 text-xs text-[#999] font-semibold text-center">Followers</td>
          <td className="py-2 text-xs text-[#999] font-semibold text-center">GG</td>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.username} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
            <td className="py-2">
              <div className="flex items-center gap-2">
                <img src={u.avatar} alt={u.username} className="h-6 w-6 rounded-full" />
                <Link href={`/${u.username}`} className="font-medium text-[#111] hover:text-[#666] transition-colors">{u.username}</Link>
                {u.name && <span className="text-[#aaa] hidden md:inline">{u.name}</span>}
              </div>
            </td>
            <td className="py-2 text-[#888] text-base line-clamp-1 max-w-xs hidden sm:table-cell">{u.bio || '\u2014'}</td>
            <td className="py-2 text-center">
              {u.isMutual ? (
                <span className="text-[#3b82f6] font-semibold text-[13px]">Mutual</span>
              ) : u.isFollowing ? (
                <span className="text-[#888] text-[13px]">Following</span>
              ) : (
                <span className="text-[#888] text-[13px]">Follower</span>
              )}
            </td>
            <td className="py-2 text-center font-semibold text-[#111]">{u.followers}</td>
            <td className="py-2 text-center">
              {u.hasGGProfile ? <span className="text-[#34a853] font-semibold">Yes</span> : <span className="text-[#ccc]">&mdash;</span>}
            </td>
          </tr>
        ))}
        {semanticUsers.length > 0 && (
          <>
            <tr>
              <td colSpan={5} className="py-3 text-xs text-[#8b5cf6] font-semibold uppercase tracking-[1px]">
                Semantically Similar Developers
              </td>
            </tr>
            {semanticUsers.map((u) => (
              <tr key={`sem-${u.username}`} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <img src={u.avatar} alt={u.username} className="h-6 w-6 rounded-full" />
                    <Link href={`/${u.username}`} className="font-medium text-[#111] hover:text-[#666] transition-colors">{u.username}</Link>
                  </div>
                </td>
                <td className="py-2 text-[#888] text-base line-clamp-1 max-w-xs hidden sm:table-cell">{u.archetype || u.bio || '\u2014'}</td>
                <td className="py-2 text-center"><span className="text-[#8b5cf6] font-semibold text-[13px]">{u.similarity}%</span></td>
                <td className="py-2 text-center text-[#666]">
                  {u.score != null ? <span>{u.score}<span className="text-[#aaa] text-[11px]">/100</span></span> : '\u2014'}
                </td>
                <td className="py-2 text-center"><span className="text-[#34a853] font-semibold">Yes</span></td>
              </tr>
            ))}
          </>
        )}
      </tbody>
    </table>
  );
}

function ExploreAllTable({ profiles }: { profiles: Array<{
  username: string;
  avatar: string;
  summary: string | null;
  archetype: string | null;
  score: number | null;
  topSkills: string[];
  updatedAt: string;
}> }) {
  return (
    <table className="w-full text-base border-collapse table-fixed">
      <thead>
        <tr className="border-b border-[#ddd]">
          <td className="w-[30%] py-2 text-xs text-[#999] font-semibold">Developer</td>
          <td className="w-[25%] py-2 text-xs text-[#999] font-semibold hidden lg:table-cell">Archetype</td>
          <td className="w-[25%] py-2 text-xs text-[#999] font-semibold hidden sm:table-cell">Skills</td>
          <td className="w-[10%] py-2 text-xs text-[#999] font-semibold text-center">Score</td>
          <td className="w-[10%] py-2 text-xs text-[#999] font-semibold text-right hidden sm:table-cell">Analyzed</td>
        </tr>
      </thead>
      <tbody>
        {profiles.map((u) => (
          <tr key={u.username} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
            <td className="py-2">
              <div className="flex items-center gap-2">
                <img src={u.avatar} alt={u.username} className="h-6 w-6 rounded-full" />
                <Link href={`/${u.username}`} className="font-medium text-[#111] hover:text-[#666] transition-colors truncate">{u.username}</Link>
              </div>
            </td>
            <td className="py-2 text-[#888] text-[13px] truncate hidden lg:table-cell">{u.archetype || '\u2014'}</td>
            <td className="py-2 hidden sm:table-cell">
              <div className="flex flex-wrap gap-1">
                {u.topSkills.slice(0, 3).map(skill => (
                  <span key={skill} className="text-[11px] text-[#666] bg-[#f5f5f5] px-1.5 py-0.5 rounded">{skill}</span>
                ))}
              </div>
            </td>
            <td className="py-2 text-center">
              {u.score != null ? (
                <span className="font-semibold text-[#111]">{u.score}<span className="text-[13px] text-[#aaa] ml-0.5">/100</span></span>
              ) : <span className="text-[#ccc]">N/A</span>}
            </td>
            <td className="py-2 text-right text-[#888] text-[13px] hidden sm:table-cell">
              {new Date(u.updatedAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
