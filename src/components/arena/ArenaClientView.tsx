"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';
import { LeaderboardTable } from './LeaderboardTable';
import { ChallengeForm } from './ChallengeForm';
import { BattleAnalysis } from './BattleAnalysis';
import { useAuth } from '@/lib/auth/client';
import { Sword, History } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types/leaderboard';

interface ArenaClientViewProps {
  initialLeaderboard?: LeaderboardEntry[];
}

export function ArenaClientView({ initialLeaderboard }: ArenaClientViewProps) {
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
      <div className="max-w-[1400px] mx-auto px-6 py-20 space-y-12">
        <Skeleton className="h-32 w-full max-w-md mx-auto" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl md:text-8xl font-bold text-black tracking-tighter">
            Dev Rank
          </h1>
          <p className="text-xl text-gray-500 font-light max-w-2xl mx-auto">
            Compete in AI-judged coding battles.
          </p>
        </div>

        {/* My Stats Row */}
        {isSignedIn && myRanking && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto py-12 border-y border-gray-100">
            <div className="text-center space-y-1">
              <div className="text-5xl font-bold text-black tracking-tight">{myRanking.eloRating}</div>
              <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">ELO Rating</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-5xl font-bold text-black tracking-tight">{myRanking.tier}</div>
              <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">Tier</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-5xl font-bold text-black tracking-tight">{myRanking.wins}</div>
              <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">Wins</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-5xl font-bold text-black tracking-tight">{myRanking.winStreak}</div>
              <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">Streak</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 bg-gray-50 rounded-xl border border-gray-100">
            {['leaderboard', 'battle', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[400px] max-w-5xl mx-auto">
          {activeTab === 'leaderboard' && (
            <LeaderboardTable initialLeaderboard={initialLeaderboard} />
          )}

          {activeTab === 'battle' && (
            canBattle ? (
              <ChallengeForm />
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-8 border border-gray-100 rounded-2xl bg-gray-50/50">
                <div className="h-20 w-20 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                  <Sword className="h-8 w-8 text-black" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-black">Start Battling</h3>
                  <p className="text-gray-500 max-w-md mx-auto font-light">
                    Upgrade to challenge other developers in AI-judged coding battles.
                  </p>
                </div>
                <Button className="bg-black text-white hover:bg-gray-800 px-8 py-6 rounded-xl text-lg font-medium shadow-lg hover:shadow-xl transition-all">
                  Upgrade to Battle
                </Button>
              </div>
            )
          )}

          {activeTab === 'history' && (
            canBattle ? (
              <BattleAnalysis />
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-8 border border-gray-100 rounded-2xl bg-gray-50/50">
                <div className="h-20 w-20 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                  <History className="h-8 w-8 text-black" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-black">Battle History</h3>
                  <p className="text-gray-500 max-w-md mx-auto font-light">
                    Upgrade to view your detailed battle history and AI analysis.
                  </p>
                </div>
                <Button className="bg-black text-white hover:bg-gray-800 px-8 py-6 rounded-xl text-lg font-medium shadow-lg hover:shadow-xl transition-all">
                  Upgrade to View History
                </Button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
