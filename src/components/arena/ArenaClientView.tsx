"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingWave } from '@/components/LoadingWave';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import { trpc } from '@/lib/trpc/client';
import { 
  Trophy, 
  Sword, 
  Users, 
  TrendingUp, 
  Target, 
  Zap,
  Crown,
  Medal} from 'lucide-react';
import { BattleCard } from './BattleCard';
import { LeaderboardTable } from './LeaderboardTable';
import { ChallengeForm } from './ChallengeForm';

export function ArenaClientView() {
  const [activeTab, setActiveTab] = useState('overview');

  // Get user data
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery();
  const { data: myRanking, isLoading: rankingLoading } = trpc.arena.getMyRanking.useQuery();
  const { data: leaderboard, isLoading: leaderboardLoading } = trpc.arena.getLeaderboard.useQuery({ limit: 10 });
  const { data: battleHistory, isLoading: historyLoading } = trpc.arena.getBattleHistory.useQuery({ limit: 5 });

  // const isLoading = planLoading || rankingLoading || leaderboardLoading || historyLoading;

  // If plan is loading, show loading
  if (planLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingWave />
      </div>
    );
  }

  // If user does not have a paid plan, show upgrade
  if (!currentPlan || currentPlan.plan === 'free') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <SubscriptionUpgrade />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="h-12 w-12 text-yellow-500" />
          <h1 className="text-4xl font-bold">🏟️ DEV ARENA</h1>
          <Trophy className="h-12 w-12 text-yellow-500" />
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Challenge developers, climb the rankings, and prove your coding prowess in epic AI-judged battles!
        </p>
      </div>

      {/* My Ranking Card */}
      {myRanking && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              My Arena Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{myRanking.eloRating}</div>
                <div className="text-sm text-muted-foreground">ELO Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{myRanking.tier}</div>
                <div className="text-sm text-muted-foreground">Tier</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{myRanking.wins}W - {myRanking.losses}L</div>
                <div className="text-sm text-muted-foreground">Record</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{myRanking.winStreak}</div>
                <div className="text-sm text-muted-foreground">Win Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="battle" className="flex items-center gap-2">
            <Sword className="h-4 w-4" />
            Battle
          </TabsTrigger>
          <TabsTrigger value="rankings" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rankings
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Battles</span>
                  <Badge variant="outline">{myRanking?.totalBattles || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Win Rate</span>
                  <Badge variant="outline">
                    {myRanking?.totalBattles ? Math.round((myRanking.wins / myRanking.totalBattles) * 100) : 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Best Win Streak</span>
                  <Badge variant="outline">{myRanking?.bestWinStreak || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Battles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sword className="h-5 w-5" />
                  Recent Battles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <LoadingWave />
                ) : battleHistory && battleHistory.length > 0 ? (
                  <div className="space-y-3">
                    {battleHistory.slice(0, 3).map((battle) => (
                      <div key={battle.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div>
                          <div className="font-medium">{battle.challengerUsername} vs {battle.opponentUsername}</div>
                          <div className="text-sm text-muted-foreground">
                            {battle.completedAt ? new Date(battle.completedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <Badge variant={battle.winnerId === battle.challengerId ? "default" : "secondary"}>
                          {battle.winnerId === battle.challengerId ? "W" : "L"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No battles yet. Challenge someone to get started!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top 5 Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5" />
                Top 5 Developers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <LoadingWave />
              ) : leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <div key={entry.username} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{entry.username}</div>
                          <div className="text-sm text-muted-foreground">{entry.tier}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{entry.eloRating}</div>
                        <div className="text-sm text-muted-foreground">{entry.winRate.toFixed(1)}% WR</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No rankings available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Battle Tab */}
        <TabsContent value="battle" className="space-y-6">
          <ChallengeForm />
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-6">
          <LeaderboardTable />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Battle History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <LoadingWave />
              ) : battleHistory && battleHistory.length > 0 ? (
                <div className="space-y-4">
                  {battleHistory.map((battle) => (
                    <BattleCard key={battle.id} battle={battle as any} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No battle history yet. Challenge someone to get started!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 