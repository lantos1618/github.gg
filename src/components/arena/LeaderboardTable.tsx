"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { LoadingPage } from '@/components/common';
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
    <div className="space-y-12">
      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search developers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-14 text-lg border-2 border-gray-100 rounded-xl focus:border-black focus:ring-0 transition-colors"
        />
      </div>

      {isLoading ? (
        <LoadingPage text="Loading leaderboard..." />
      ) : filteredAndSortedLeaderboard.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-6 pl-4 pr-8 text-sm font-medium text-gray-500 w-24">Rank</th>
                <th className="py-6 px-8 text-sm font-medium text-gray-500">Developer</th>
                <th 
                  className="py-6 px-8 text-center text-sm font-medium text-gray-500 cursor-pointer hover:text-black transition-colors"
                  onClick={() => handleSort('eloRating')}
                >
                  <div className="flex items-center justify-center gap-2">
                    ELO {getSortIcon('eloRating')}
                  </div>
                </th>
                <th 
                  className="py-6 px-8 text-center text-sm font-medium text-gray-500 cursor-pointer hover:text-black transition-colors hidden sm:table-cell"
                  onClick={() => handleSort('winRate')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Win Rate {getSortIcon('winRate')}
                  </div>
                </th>
                <th 
                  className="py-6 px-8 text-center text-sm font-medium text-gray-500 cursor-pointer hover:text-black transition-colors hidden md:table-cell"
                  onClick={() => handleSort('winStreak')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Streak {getSortIcon('winStreak')}
                  </div>
                </th>
                <th className="py-6 px-8 text-center text-sm font-medium text-gray-500 hidden lg:table-cell">Record</th>
                {canBattle && <th className="py-6 pr-4 text-right text-sm font-medium text-gray-500">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAndSortedLeaderboard.map((entry, index) => {
                const isCurrentUser = entry.username.toLowerCase() === currentUsername;
                return (
                  <tr
                    key={entry.username}
                    className="group hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-6 pl-4 pr-8">
                      <span className={`font-mono font-bold text-lg ${
                        entry.rank <= 3 ? 'text-black' : 'text-gray-400'
                      }`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <Link href={`/${entry.username}`} className="flex items-center gap-4 group/link">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden border border-gray-200 bg-gray-50 group-hover/link:border-gray-300 transition-colors">
                          <Image
                            src={`https://github.com/${entry.username}.png`}
                            alt={entry.username}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div>
                          <div className="font-bold text-black flex items-center gap-2 text-base group-hover/link:text-blue-600 transition-colors">
                            {entry.username}
                            {isCurrentUser && (
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-600" title="You" />
                            )}
                          </div>
                          <div className="text-xs text-gray-400 font-mono uppercase tracking-wide mt-0.5">{entry.tier}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-6 px-8 text-center">
                      <span className="font-bold text-black text-lg">{entry.eloRating}</span>
                    </td>
                    <td className="py-6 px-8 text-center hidden sm:table-cell">
                      <span className="text-gray-600 font-medium">{entry.winRate.toFixed(1)}%</span>
                    </td>
                    <td className="py-6 px-8 text-center hidden md:table-cell">
                      <span className="text-gray-600 font-medium">{entry.winStreak}</span>
                    </td>
                    <td className="py-6 px-8 text-center hidden lg:table-cell">
                      <span className="text-sm font-mono text-gray-500">
                        {entry.wins}W - {entry.losses}L
                      </span>
                    </td>
                    {canBattle && (
                      <td className="py-6 pr-4 text-right">
                        {!isCurrentUser && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChallenge(entry.username)}
                            className="border-gray-200 hover:border-black hover:bg-transparent h-9 px-4 font-medium transition-colors"
                          >
                            Challenge
                          </Button>
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
        <div className="py-20 text-center border-t border-gray-100">
          <p className="text-gray-400 text-lg">No developers found matching your search.</p>
        </div>
      )}
    </div>
  );
}
