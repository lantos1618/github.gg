"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingWave } from '@/components/LoadingWave';
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
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [limit, setLimit] = useState(50);
  const [sortField, setSortField] = useState<SortField>('eloRating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: leaderboard, isLoading } = trpc.arena.getLeaderboard.useQuery({
    limit,
    tier: selectedTier === 'all' ? undefined : selectedTier
  });

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

  const tiers = [
    { value: 'all', label: 'All Tiers' },
    { value: 'Bronze', label: 'Bronze' },
    { value: 'Silver', label: 'Silver' },
    { value: 'Gold', label: 'Gold' },
    { value: 'Platinum', label: 'Platinum' },
    { value: 'Diamond', label: 'Diamond' },
    { value: 'Master', label: 'Master' },
  ];

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

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search developers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tier Filter */}
            <div className="flex flex-wrap gap-2">
              {tiers.map((tier) => (
                <Button
                  key={tier.value}
                  variant={selectedTier === tier.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTier(tier.value)}
                >
                  {tier.label}
                </Button>
              ))}
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Show:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-center justify-center py-12">
              <LoadingWave />
            </div>
          ) : filteredAndSortedLeaderboard.length > 0 ? (
            <>
              {/* Sort Controls */}
              <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b">
                <span className="text-sm font-medium text-muted-foreground mr-2">Sort by:</span>
                <Button
                  variant={sortField === 'eloRating' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('eloRating')}
                  className="gap-2"
                >
                  ELO {getSortIcon('eloRating')}
                </Button>
                <Button
                  variant={sortField === 'winRate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('winRate')}
                  className="gap-2"
                >
                  Win Rate {getSortIcon('winRate')}
                </Button>
                <Button
                  variant={sortField === 'winStreak' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('winStreak')}
                  className="gap-2"
                >
                  Streak {getSortIcon('winStreak')}
                </Button>
                <Button
                  variant={sortField === 'totalBattles' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('totalBattles')}
                  className="gap-2"
                >
                  Battles {getSortIcon('totalBattles')}
                </Button>
                <Button
                  variant={sortField === 'wins' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('wins')}
                  className="gap-2"
                >
                  Wins {getSortIcon('wins')}
                </Button>
              </div>

              {/* Leaderboard Entries */}
              <div className="space-y-3">
                {filteredAndSortedLeaderboard.map((entry, index) => {
                  const isCurrentUser = entry.username.toLowerCase() === currentUsername;
                  return (
                    <div
                      key={entry.username}
                      onClick={() => !isCurrentUser && canBattle && handleChallenge(entry.username)}
                      className={`p-4 rounded-lg border transition-all ${
                        index === 0
                          ? 'bg-yellow-50 border-yellow-200' :
                        index === 1
                          ? 'bg-gray-50 border-gray-200' :
                        index === 2
                          ? 'bg-amber-50 border-amber-200' :
                          'bg-background border-border hover:bg-muted/50'
                      } ${!isCurrentUser && canBattle ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Rank and User */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                              {getRankIcon(entry.rank) || entry.rank}
                            </div>
                            <div>
                              <div className="font-semibold text-lg flex items-center gap-2">
                                {entry.username}
                                {isCurrentUser && (
                                  <Badge variant="secondary" className="text-xs">You</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {entry.tier}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {entry.totalBattles} battles
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {entry.eloRating}
                            </div>
                            <div className="text-xs text-muted-foreground">ELO</div>
                          </div>

                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">
                              {entry.winRate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Win Rate</div>
                          </div>

                          <div className="text-center">
                            <div className="text-lg font-semibold text-orange-600">
                              {entry.winStreak}
                            </div>
                            <div className="text-xs text-muted-foreground">Streak</div>
                          </div>

                          <div className="text-center">
                            <div className="text-sm font-medium">
                              {entry.wins}W - {entry.losses}L
                            </div>
                            <div className="text-xs text-muted-foreground">Record</div>
                          </div>

                          {/* Click to Challenge Indicator */}
                          {!isCurrentUser && canBattle && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Sword className="h-3 w-3" />
                              <span>Click to challenge</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              <div className="text-2xl font-bold text-purple-600">
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