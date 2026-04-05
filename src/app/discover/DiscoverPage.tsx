"use client";

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { NetworkGraph } from '@/components/admin/NetworkGraph';

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <NetworkExplorer />
      </div>
    </div>
  );
}

function NetworkExplorer() {
  const [seedUsername, setSeedUsername] = useState('');
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

  const handleSearch = () => {
    if (seedUsername.trim()) {
      setActiveUsername(seedUsername.trim().replace(/^@/, ''));
      setSelectedUsers(new Set());
    }
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">Discover</div>
          <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">Find Developers</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            value={seedUsername}
            onChange={(e) => setSeedUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. torvalds, antfu"
            className="w-48 border-0 border-b border-[#ddd] bg-transparent text-base text-[#111] placeholder:text-[#ccc] hover:border-[#888] focus:border-[#111] focus:outline-none focus:ring-0 transition-colors py-1.5"
          />
          <div className="flex gap-1">
            <button
              onClick={() => { setNetworkType('following'); handleSearch(); }}
              className={`px-3 py-1.5 text-base font-medium rounded transition-colors ${networkType === 'following' ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] border border-[#eee]'}`}
            >
              Following
            </button>
            <button
              onClick={() => { setNetworkType('followers'); handleSearch(); }}
              className={`px-3 py-1.5 text-base font-medium rounded transition-colors ${networkType === 'followers' ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] border border-[#eee]'}`}
            >
              Followers
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="py-8 text-center text-base text-[#aaa]">Loading {networkType} for {activeUsername}...</div>
      )}

      {network && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-base text-[#888]">
              {network.users.length} {network.type} of <strong className="text-[#111]">@{network.seed}</strong>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-semibold tracking-[1px] uppercase rounded transition-colors ${viewMode === 'table' ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] border border-[#eee]'}`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1.5 text-xs font-semibold tracking-[1px] uppercase rounded transition-colors ${viewMode === 'graph' ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] border border-[#eee]'}`}
              >
                Graph
              </button>
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
