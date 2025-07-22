"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingWave } from '@/components/LoadingWave';
import { trpc } from '@/lib/trpc/client';
import { 
  Trophy, 
  Sword, 
  Zap,
  Crown,
  Medal,
  Eye,
  History,
  BarChart3
} from 'lucide-react';
import { LeaderboardTable } from './LeaderboardTable';
import { ChallengeForm } from './ChallengeForm';
import { BattleAnalysis } from './BattleAnalysis';
import { useAuth } from '@/lib/auth/client';

export function ArenaClientView() {
  const [activeTab, setActiveTab] = useState('overview');

  // Auth and plan
  const { user, isSignedIn, isLoading: authLoading } = useAuth();
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery(undefined, { enabled: isSignedIn });

  // Ranking: if signed in, use userId; else, skip query
  const myRankingQueryEnabled = isSignedIn && !!user?.id;
  const { data: myRanking } = trpc.arena.getMyRanking.useQuery(
    myRankingQueryEnabled ? { userId: user.id, username: user.name } : { userId: '', username: '' },
    { enabled: myRankingQueryEnabled }
  );

  // Leaderboard is always public
  const { data: leaderboard, isLoading: leaderboardLoading } = trpc.arena.getLeaderboard.useQuery({ limit: 10 });

  // Battle history: only for paid users
  const canBattle = isSignedIn && currentPlan && currentPlan.plan !== 'free';
  const { data: battleHistory, isLoading: historyLoading } = trpc.arena.getBattleHistory.useQuery({ limit: 5, offset: 0 }, { enabled: canBattle });

  // Loading state for auth
  if (authLoading || planLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingWave />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-4xl font-bold">DEV ARENA</h1>
          <Trophy className="h-8 w-8 text-yellow-500" />
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Challenge developers, climb the rankings, and prove your coding prowess in epic AI-judged battles!
        </p>
      </div>

      {/* My Ranking Card (only if signed in) */}
      {isSignedIn && myRanking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              My Arena Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-purple-600">
                  {myRanking.eloRating}
                </div>
                <div className="text-sm text-muted-foreground">ELO Rating</div>
              </div>
              <div className="text-center space-y-2">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {myRanking.tier}
                </Badge>
                <div className="text-sm text-muted-foreground">Tier</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-blue-600">
                  {myRanking.wins}W - {myRanking.losses}L
                </div>
                <div className="text-sm text-muted-foreground">Record</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-orange-600">
                  {myRanking.winStreak}
                </div>
                <div className="text-sm text-muted-foreground">Win Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="battle" className="flex items-center gap-2">
            <Sword className="h-4 w-4" />
            Battle
          </TabsTrigger>
          <TabsTrigger value="rankings" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Rankings
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats (show if signed in, else prompt) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSignedIn && myRanking ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Battles</span>
                      <span className="font-bold text-lg">{myRanking.totalBattles || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className="font-bold text-lg">
                        {myRanking.totalBattles > 0 
                          ? ((myRanking.wins / myRanking.totalBattles) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Best Win Streak</span>
                      <span className="font-bold text-lg">{myRanking.bestWinStreak || 0}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground">Sign in to see your stats</div>
                )}
              </CardContent>
            </Card>

            {/* Recent Battles (only for paid users) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sword className="h-5 w-5" />
                  Recent Battles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canBattle ? (
                  historyLoading ? (
                    <LoadingWave />
                  ) : battleHistory && battleHistory.length > 0 ? (
                    <div className="space-y-3">
                      {battleHistory.slice(0, 3).map((battle) => (
                        <div key={battle.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {battle.challengerUsername} vs {battle.opponentUsername}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(battle.completedAt!).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant={battle.winnerId === battle.challengerId ? "default" : "destructive"} className="text-xs">
                            {battle.winnerId === battle.challengerId ? "W" : "L"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No battles yet. Start your first challenge!
                    </p>
                  )
                ) : (
                  <div className="text-center text-muted-foreground">Sign in and upgrade to see your battle history</div>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Developers (always public) */}
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
                  <div className="space-y-3">
                    {leaderboard.slice(0, 5).map((entry, index) => (
                      <div key={entry.username} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{entry.username}</div>
                            <div className="text-xs text-muted-foreground">{entry.tier}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{entry.eloRating}</div>
                          <div className="text-xs text-muted-foreground">{entry.winRate.toFixed(1)}% WR</div>
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
          </div>
        </TabsContent>

        {/* Battle Tab (only for paid users) */}
        <TabsContent value="battle" className="space-y-6">
          {canBattle ? <ChallengeForm /> : <div className="text-center text-muted-foreground">Sign in and upgrade to challenge other developers</div>}
        </TabsContent>

        {/* Rankings Tab (always public) */}
        <TabsContent value="rankings" className="space-y-6">
          <LeaderboardTable />
        </TabsContent>

        {/* History Tab (only for paid users) */}
        <TabsContent value="history" className="space-y-6">
          {canBattle ? <BattleAnalysis /> : <div className="text-center text-muted-foreground">Sign in and upgrade to see your battle history</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
} 