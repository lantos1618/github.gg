"use client";

import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Skeleton } from 'boneyard-js/react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { TextButton } from '@/components/ui/text-button';
import { NetworkGraph } from '@/components/admin/NetworkGraph';
import { useSessionHint } from '@/lib/session-context';
import { PageWidthContainer } from '@/components/PageWidthContainer';

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer>
        <NetworkExplorer />
      </PageWidthContainer>
    </div>
  );
}

function NetworkExplorer() {
  const hint = useSessionHint();
  const [seedUsername, setSeedUsername] = useState(hint?.githubUsername || '');
  const [activeUsername, setActiveUsername] = useState('');
  const [networkType, setNetworkType] = useState<'followers' | 'following'>('following');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const trpcUtils = trpc.useUtils();

  const { data: network, isLoading } = trpc.discover.getNetworkUsers.useQuery(
    { username: activeUsername, type: networkType, limit: 50 },
    { enabled: !!activeUsername }
  );

  const handleExpandNode = useCallback(async (username: string) => {
    try {
      const result = await trpcUtils.discover.getNetworkUsers.fetch({
        username,
        type: networkType,
        limit: 30,
      });
      return result.users;
    } catch {
      return null;
    }
  }, [trpcUtils, networkType]);

  const handleSearch = useCallback(() => {
    if (seedUsername.trim()) {
      setActiveUsername(seedUsername.trim().replace(/^@/, ''));
      setSelectedUsers(new Set());
    }
  }, [seedUsername]);

  // Auto-trigger search on mount if username is pre-filled from session
  useEffect(() => {
    if (seedUsername && !activeUsername) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">Discover</h1>
        </div>
        <div className="flex items-end gap-6 flex-shrink-0">
          <input
            value={seedUsername}
            onChange={(e) => setSeedUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. torvalds, antfu"
            className="w-48 border-0 border-b-2 border-[#ddd] bg-transparent text-base text-[#111] placeholder:text-[#ccc] hover:border-[#888] focus:border-[#111] focus:text-[#000] focus:placeholder:text-[#999] focus:outline-none focus:ring-0 transition-colors pb-1"
          />
          <TextButton
            onClick={() => { setNetworkType('following'); handleSearch(); }}
            active={networkType === 'following'}
            size="base"
            className="pb-1 font-medium"
          >
            Following
          </TextButton>
          <TextButton
            onClick={() => { setNetworkType('followers'); handleSearch(); }}
            active={networkType === 'followers'}
            size="base"
            className="pb-1 font-medium"
          >
            Followers
          </TextButton>
        </div>
      </div>

      <Skeleton
        name="discover-network"
        loading={isLoading && !network}
        fallback={
          <div className="py-6 space-y-3">
            <div className="animate-pulse rounded-md bg-gray-200 h-8 w-48 mx-auto" />
            <div className="animate-pulse rounded-md bg-gray-200 h-[70vh] min-h-[600px] w-full" />
          </div>
        }
        fixture={
          <div className="py-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-64 bg-gray-200 rounded" />
              <div className="flex gap-1">
                <div className="h-8 w-16 bg-gray-200 rounded" />
                <div className="h-8 w-16 bg-gray-200 rounded" />
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ddd]">
                  {['Developer', 'Bio', 'Repos', 'Followers', 'GG'].map(h => (
                    <td key={h} className="py-2"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f0f0f0]">
                    <td className="py-2"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-gray-200" /><div className="h-4 w-24 bg-gray-200 rounded" /></div></td>
                    <td className="py-2"><div className="h-4 w-40 bg-gray-200 rounded" /></td>
                    <td className="py-2 text-center"><div className="h-4 w-8 bg-gray-200 rounded mx-auto" /></td>
                    <td className="py-2 text-center"><div className="h-4 w-12 bg-gray-200 rounded mx-auto" /></td>
                    <td className="py-2 text-center"><div className="h-4 w-8 bg-gray-200 rounded mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      >
        <div />
      </Skeleton>

      {network && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-base text-[#888]">
              {network.users.length} {network.type} of <strong className="text-[#111]">@{network.seed}</strong>
            </span>
            <div className="flex gap-4">
              <TextButton
                onClick={() => setViewMode('table')}
                active={viewMode === 'table'}
                className="pb-1 text-xs font-semibold tracking-[1px] uppercase"
              >
                Table
              </TextButton>
              <TextButton
                onClick={() => setViewMode('graph')}
                active={viewMode === 'graph'}
                className="pb-1 text-xs font-semibold tracking-[1px] uppercase"
              >
                Graph
              </TextButton>
            </div>
          </div>

          {viewMode === 'graph' ? (
            <NetworkGraph
              users={network.users}
              seed={network.seed}
              onExpandNode={handleExpandNode}
              onSelectionChange={setSelectedUsers}
            />
          ) : (
            <table className="w-full text-base border-collapse">
              <thead>
                <tr className="border-b border-[#ddd]">
                  <td className="py-2 text-xs text-[#999] font-semibold">Developer</td>
                  <td className="py-2 text-xs text-[#999] font-semibold hidden sm:table-cell">Bio</td>
                  <td className="py-2 text-xs text-[#999] font-semibold text-center">Repos</td>
                  <td className="py-2 text-xs text-[#999] font-semibold text-center">Followers</td>
                  <td className="py-2 text-xs text-[#999] font-semibold text-center">GG</td>
                </tr>
              </thead>
              <tbody>
                {network.users.map((u) => (
                  <tr key={u.username} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <img src={u.avatar} alt={u.username} className="h-6 w-6 rounded-full" />
                        <Link
                          href={`/${u.username}`}
                          className="font-medium text-[#111] hover:text-[#666] transition-colors"
                        >
                          {u.username}
                        </Link>
                        {u.name && <span className="text-[#aaa] hidden md:inline">{u.name}</span>}
                      </div>
                    </td>
                    <td className="py-2 text-[#888] text-base line-clamp-1 max-w-xs hidden sm:table-cell">{u.bio || '—'}</td>
                    <td className="py-2 text-center text-[#666]">{u.publicRepos}</td>
                    <td className="py-2 text-center font-semibold text-[#111]">{u.followers}</td>
                    <td className="py-2 text-center">
                      {u.hasGGProfile ? (
                        <span className="text-[#34a853] font-semibold">Yes</span>
                      ) : (
                        <span className="text-[#ccc]">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
