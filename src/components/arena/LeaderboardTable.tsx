"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingWave } from '@/components/LoadingWave';
import { trpc } from '@/lib/trpc/client';
import { 
  BarChart3, 
  Search, 
  Trophy, 
  Medal, 
  Crown,
  Users
} from 'lucide-react';

export function LeaderboardTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [limit, setLimit] = useState(50);

  const { data: leaderboard, isLoading } = trpc.arena.getLeaderboard.useQuery({ 
    limit,
    tier: selectedTier === 'all' ? undefined : selectedTier 
  });

  const filteredLeaderboard = leaderboard?.filter(entry =>
    entry.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
              {filteredLeaderboard.length} developers
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingWave />
            </div>
          ) : filteredLeaderboard.length > 0 ? (
            <div className="space-y-3">
              {filteredLeaderboard.map((entry, index) => (
                <div
                  key={entry.username}
                  className={`p-4 rounded-lg border transition-colors ${
                    index === 0 
                      ? 'bg-yellow-50 border-yellow-200' :
                    index === 1 
                      ? 'bg-gray-50 border-gray-200' :
                    index === 2 
                      ? 'bg-amber-50 border-amber-200' :
                      'bg-background border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Rank and User */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                          {getRankIcon(entry.rank) || entry.rank}
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{entry.username}</div>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
      {filteredLeaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredLeaderboard.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Developers</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(filteredLeaderboard.reduce((sum, entry) => sum + entry.eloRating, 0) / filteredLeaderboard.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg ELO</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(filteredLeaderboard.reduce((sum, entry) => sum + entry.winRate, 0) / filteredLeaderboard.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Win Rate</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...filteredLeaderboard.map(entry => entry.winStreak))}
              </div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 