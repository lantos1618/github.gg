"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeaderboardEntry } from '@/lib/types/leaderboard';

type SortField = 'eloRating' | 'winRate' | 'winStreak' | 'totalBattles' | 'wins';
type SortDirection = 'asc' | 'desc';

interface LeaderboardTableProps {
  initialLeaderboard?: LeaderboardEntry[];
}

export function LeaderboardTable({ initialLeaderboard }: LeaderboardTableProps) {
  const router = useRouter();
  const { user, isSignedIn } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [limit] = useState(50);
  const [sortField, setSortField] = useState<SortField>('eloRating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: leaderboard, isLoading } = trpc.arena.getLeaderboard.useQuery(
    { limit },
    { initialData: initialLeaderboard }
  );

  const { data: currentPlan } = trpc.user.getCurrentPlan.useQuery(undefined, {
    enabled: isSignedIn
  });

  const handleChallenge = (username: string) => {
    router.push(`/arena?tab=battle&opponent=${encodeURIComponent(username)}`);
  };

  const canBattle = isSignedIn && currentPlan && currentPlan.plan !== 'free';
  const currentUsername = user?.name?.toLowerCase();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredAndSortedLeaderboard = (leaderboard?.filter(entry =>
    entry.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ccc]" />
        <Input
          placeholder="Search developers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="arena-leaderboard-search-input"
          className="pl-10 h-10 text-[14px] border border-[#ddd] rounded focus:border-[#111] focus:ring-0 transition-colors placeholder:text-[#ccc]"
        />
      </div>

      {isLoading ? (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#ddd]">
              <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold w-16">Rank</td>
              <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold">Developer</td>
              <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-center">ELO</td>
              <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-center hidden sm:table-cell">Win Rate</td>
              <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-center hidden md:table-cell">Streak</td>
              <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-center hidden lg:table-cell">Record</td>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr key={i} className="border-b border-[#f0f0f0]">
                <td className="py-3 px-2"><Skeleton className="h-4 w-8" /></td>
                <td className="py-3 px-2"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></td>
                <td className="py-3 px-2 text-center"><Skeleton className="h-4 w-10 mx-auto" /></td>
                <td className="py-3 px-2 text-center hidden sm:table-cell"><Skeleton className="h-4 w-12 mx-auto" /></td>
                <td className="py-3 px-2 text-center hidden md:table-cell"><Skeleton className="h-4 w-6 mx-auto" /></td>
                <td className="py-3 px-2 text-center hidden lg:table-cell"><Skeleton className="h-4 w-14 mx-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : filteredAndSortedLeaderboard.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="border-b border-[#ddd]">
                <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold w-16">Rank</td>
                <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold">Developer</td>
                <td
                  className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-center cursor-pointer hover:text-[#111] transition-colors"
                  onClick={() => handleSort('eloRating')}
                >
                  <span className="inline-flex items-center">ELO {getSortIcon('eloRating')}</span>
                </td>
                <td
                  className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-center cursor-pointer hover:text-[#111] transition-colors hidden sm:table-cell"
                  onClick={() => handleSort('winRate')}
                >
                  <span className="inline-flex items-center">Win Rate {getSortIcon('winRate')}</span>
                </td>
                <td
                  className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-center cursor-pointer hover:text-[#111] transition-colors hidden md:table-cell"
                  onClick={() => handleSort('winStreak')}
                >
                  <span className="inline-flex items-center">Streak {getSortIcon('winStreak')}</span>
                </td>
                <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-center hidden lg:table-cell">Record</td>
                {canBattle && <td className="py-2 px-2 text-[12px] text-[#aaa] font-semibold text-right">Action</td>}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedLeaderboard.map((entry) => {
                const isCurrentUser = entry.username.toLowerCase() === currentUsername;
                return (
                  <tr key={entry.username} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                    <td className="py-3 px-2">
                      <span className={`font-mono font-semibold ${entry.rank <= 3 ? 'text-[#111]' : 'text-[#aaa]'}`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <Link href={`/${entry.username}`} className="flex items-center gap-3 group">
                        <div className="relative h-8 w-8 rounded-full overflow-hidden border border-[#eee] bg-[#f8f9fa]">
                          <Image src={`https://github.com/${entry.username}.png`} alt={entry.username} fill className="object-cover" unoptimized />
                        </div>
                        <div>
                          <div className="font-medium text-[#111] group-hover:text-[#666] transition-colors flex items-center gap-1.5">
                            {entry.username}
                            {isCurrentUser && <div className="h-1.5 w-1.5 rounded-full bg-[#4285f4]" title="You" />}
                          </div>
                          <div className="text-[12px] text-[#aaa] font-mono uppercase tracking-[1px]">{entry.tier}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-center font-semibold text-[#111]">{entry.eloRating}</td>
                    <td className="py-3 px-2 text-center text-[#666] hidden sm:table-cell">{entry.winRate.toFixed(1)}%</td>
                    <td className="py-3 px-2 text-center text-[#666] hidden md:table-cell">{entry.winStreak}</td>
                    <td className="py-3 px-2 text-center font-mono text-[#888] hidden lg:table-cell">{entry.wins}W-{entry.losses}L</td>
                    {canBattle && (
                      <td className="py-3 px-2 text-right">
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleChallenge(entry.username)}
                            className="px-3 py-1 text-[12px] font-medium text-[#666] border border-[#ddd] rounded hover:border-[#111] hover:text-[#111] transition-colors"
                          >
                            Challenge
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-[14px] text-[#aaa]">No developers found matching your search.</p>
        </div>
      )}
    </div>
  );
}
