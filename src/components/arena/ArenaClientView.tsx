"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingWave } from '@/components/LoadingWave';
import { trpc } from '@/lib/trpc/client';
import { Trophy, Sword, Crown, History } from 'lucide-react';
import { LeaderboardTable } from './LeaderboardTable';
import { ChallengeForm } from './ChallengeForm';
import { BattleAnalysis } from './BattleAnalysis';
import { useAuth } from '@/lib/auth/client';

export function ArenaClientView() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('leaderboard');

  // Handle tab query parameter
  useEffect(() => {
    const tabFromQuery = searchParams.get('tab');
    if (tabFromQuery && ['leaderboard', 'battle', 'history'].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [searchParams]);

  // Auth and plan
  const { user, isSignedIn, isLoading: authLoading } = useAuth();
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery(undefined, { enabled: isSignedIn });

  // Ranking
  const myRankingQueryEnabled = isSignedIn && !!user?.id;
  const { data: myRanking } = trpc.arena.getMyRanking.useQuery(
    myRankingQueryEnabled ? { userId: user.id, username: user.name } : { userId: '', username: '' },
    { enabled: myRankingQueryEnabled }
  );

  const canBattle = isSignedIn && currentPlan && currentPlan.plan !== 'free';

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
          <Trophy className="h-10 w-10 text-yellow-500" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            DEV ARENA
          </h1>
          <Trophy className="h-10 w-10 text-yellow-500" />
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Challenge developers and climb the global rankings
        </p>
      </div>

      {/* My Stats Card (only if signed in) */}
      {isSignedIn && myRanking && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Crown className="h-6 w-6 text-yellow-500" />
              Your Arena Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center space-y-1">
                <div className="text-4xl font-bold text-purple-600">
                  {myRanking.eloRating}
                </div>
                <div className="text-sm text-muted-foreground font-medium">ELO</div>
              </div>
              <div className="text-center space-y-1">
                <Badge variant="secondary" className="text-lg px-4 py-2 font-bold">
                  {myRanking.tier}
                </Badge>
                <div className="text-sm text-muted-foreground font-medium">Tier</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-green-600">{myRanking.wins}</div>
                <div className="text-sm text-muted-foreground font-medium">Wins</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-red-600">{myRanking.losses}</div>
                <div className="text-sm text-muted-foreground font-medium">Losses</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-orange-600">{myRanking.winStreak}</div>
                <div className="text-sm text-muted-foreground font-medium">Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="battle" className="flex items-center gap-2">
            <Sword className="h-4 w-4" />
            Battle
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Leaderboard Tab (combines Overview + Rankings) */}
        <TabsContent value="leaderboard" className="space-y-6">
          <LeaderboardTable />
        </TabsContent>

        {/* Battle Tab */}
        <TabsContent value="battle" className="space-y-6">
          {canBattle ? (
            <ChallengeForm />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Sword className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Start Battling</h3>
                <p className="text-muted-foreground mb-6">
                  Sign in and upgrade to challenge developers in AI-judged coding battles
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {canBattle ? (
            <BattleAnalysis />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Battle History</h3>
                <p className="text-muted-foreground mb-6">
                  Sign in and upgrade to view your battle history and detailed analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
