"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingWave } from '@/components/LoadingWave';
import { trpc } from '@/lib/trpc/client';
import { ChevronLeft, ChevronRight, Medal, Crown, Star } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export function LeaderboardTable() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data: leaderboard, isLoading } = trpc.arena.getLeaderboard.useQuery({
    limit: 100, // Get more data for pagination
  });

  const filteredData = leaderboard || [];
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = filteredData.slice(startIndex, endIndex);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
    return <Star className="h-4 w-4 text-muted-foreground" />;
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'master': return 'bg-gradient-to-r from-purple-600 to-pink-600';
      case 'diamond': return 'bg-gradient-to-r from-blue-600 to-purple-600';
      case 'platinum': return 'bg-gradient-to-r from-green-600 to-blue-600';
      case 'gold': return 'bg-gradient-to-r from-yellow-600 to-green-600';
      case 'silver': return 'bg-gradient-to-r from-orange-600 to-yellow-600';
      case 'bronze': return 'bg-gradient-to-r from-red-600 to-orange-600';
      default: return 'bg-muted';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <LoadingWave />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="h-5 w-5" />
          Developer Rankings
        </CardTitle>

      </CardHeader>
      <CardContent>
        {currentData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No rankings available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Developer</div>
              <div className="col-span-2">Tier</div>
              <div className="col-span-2">ELO</div>
              <div className="col-span-2">Win Rate</div>
              <div className="col-span-1">Battles</div>
            </div>

            {/* Table Rows */}
            {currentData.map((entry, index) => (
              <div
                key={entry.username}
                className="grid grid-cols-12 gap-4 p-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="col-span-1 flex items-center gap-2">
                  <span className="font-bold">{startIndex + index + 1}</span>
                  {getRankIcon(startIndex + index + 1)}
                </div>
                <div className="col-span-4">
                  <div className="font-medium">{entry.username}</div>
                  <div className="text-sm text-muted-foreground">
                    {entry.wins}W - {entry.losses}L
                  </div>
                </div>
                <div className="col-span-2">
                  <Badge className={`${getTierColor(entry.tier)} text-white`}>
                    {entry.tier}
                  </Badge>
                </div>
                <div className="col-span-2 font-bold text-lg">
                  {entry.eloRating}
                </div>
                <div className="col-span-2">
                  <div className="font-medium">{entry.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">
                    {entry.winStreak > 0 ? `${entry.winStreak} streak` : ''}
                  </div>
                </div>
                <div className="col-span-1 text-center">
                  {entry.totalBattles}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} developers
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 