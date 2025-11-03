"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import {
  BarChart3,
  Search,
  Trophy,
  Medal,
  Crown,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sword
} from 'lucide-react';

type SortField = 'eloRating' | 'winRate' | 'winStreak' | 'totalBattles' | 'wins';
type SortDirection = 'asc' | 'desc';

export function LeaderboardTable() {
  const router = useRouter();
  const { user, isSignedIn } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [limit] = useState(50);
  const [sortField, setSortField] = useState<SortField>('eloRating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: leaderboard, isLoading } = trpc.arena.getLeaderboard.useQuery({ limit });

  const { data: currentPlan } = trpc.user.getCurrentPlan.useQuery(undefined, {
    enabled: isSignedIn
  });

  const handleChallenge = (username: string) => {
    // Navigate to Battle tab with pre-filled opponent
    router.push(`/arena?tab=battle&opponent=${encodeURIComponent(username)}`);
  };

  const canBattle = isSignedIn && currentPlan && currentPlan.plan !== 'free';
  const currentUsername = user?.name?.toLowerCase();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new field
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const filteredAndSortedLeaderboard = (leaderboard?.filter(entry =>
    entry.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h2 className="text-3xl font-bold">Global Rankings</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          See how you stack up against developers worldwide. Climb the ranks by winning battles and improving your skills.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md w-full mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search developers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Trophy className="h-5 w-5" />
            <span>Leaderboard</span>
            <Badge variant="outline" className="ml-auto">
              {filteredAndSortedLeaderboard.length} developers
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredAndSortedLeaderboard.length > 0 ? (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Developer
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('eloRating')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          ELO {getSortIcon('eloRating')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('winRate')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Win Rate {getSortIcon('winRate')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('winStreak')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Streak {getSortIcon('winStreak')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('totalBattles')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Battles {getSortIcon('totalBattles')}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('wins')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Record {getSortIcon('wins')}
                        </div>
                      </th>
                      {canBattle && (
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedLeaderboard.map((entry, index) => {
                      const isCurrentUser = entry.username.toLowerCase() === currentUsername;
                      return (
                        <tr
                          key={entry.username}
                          className={`transition-colors ${
                            index === 0
                              ? 'bg-yellow-50 hover:bg-yellow-100' :
                            index === 1
                              ? 'bg-gray-50 hover:bg-gray-100' :
                            index === 2
                              ? 'bg-amber-50 hover:bg-amber-100' :
                              'hover:bg-gray-50'
                          } ${isCurrentUser ? 'font-semibold' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getRankIcon(entry.rank)}
                              <span className="text-lg font-bold">{entry.rank}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                {entry.username}
                                {isCurrentUser && (
                                  <Badge variant="secondary" className="text-xs">You</Badge>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs mt-1">
                                {entry.tier}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {entry.eloRating}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-lg font-semibold text-green-600">
                              {entry.winRate.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-lg font-semibold text-orange-600">
                              {entry.winStreak}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-500">
                              {entry.totalBattles}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium">
                              {entry.wins}W - {entry.losses}L
                            </div>
                          </td>
                          {canBattle && (
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {!isCurrentUser ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleChallenge(entry.username)}
                                  className="gap-1"
                                >
                                  <Sword className="h-3 w-3" />
                                  Challenge
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {filteredAndSortedLeaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredAndSortedLeaderboard.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Developers</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(filteredAndSortedLeaderboard.reduce((sum, entry) => sum + entry.eloRating, 0) / filteredAndSortedLeaderboard.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg ELO</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(filteredAndSortedLeaderboard.reduce((sum, entry) => sum + entry.winRate, 0) / filteredAndSortedLeaderboard.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Win Rate</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...filteredAndSortedLeaderboard.map(entry => entry.winStreak))}
              </div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 