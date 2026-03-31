"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LeaderboardTable } from './LeaderboardTable';
import { ChallengeForm } from './ChallengeForm';
import { BattleAnalysis } from './BattleAnalysis';
import { useAuth } from '@/lib/auth/client';
import type { LeaderboardEntry } from '@/lib/types/leaderboard';

interface ArenaClientViewProps {
  initialLeaderboard?: LeaderboardEntry[];
}

export function ArenaClientView({ initialLeaderboard }: ArenaClientViewProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('leaderboard');

  useEffect(() => {
    const tabFromQuery = searchParams.get('tab');
    if (tabFromQuery && ['leaderboard', 'battle', 'history'].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [searchParams]);

  const { user, isSignedIn, isLoading: authLoading } = useAuth();
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery(undefined, { enabled: isSignedIn });

  const myRankingQueryEnabled = isSignedIn && !!user?.id;
  const { data: myRanking } = trpc.arena.getMyRanking.useQuery(
    myRankingQueryEnabled ? { userId: user.id, username: user.name } : { userId: '', username: '' },
    { enabled: myRankingQueryEnabled }
  );

  const isAuthReady = !authLoading && !planLoading;
  const canBattle = isAuthReady && isSignedIn && currentPlan && currentPlan.plan !== 'free';

  return (
    <div className="min-h-screen bg-white pt-16 pb-20">
      <div className="w-[90%] max-w-[880px] mx-auto space-y-12">

        {/* Header */}
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Developer Arena
          </div>
          <h1 className="text-[31px] sm:text-[48px] font-semibold text-[#111] tracking-tight leading-tight">
            Dev Rank
          </h1>
          <p className="text-base text-[#666] mt-2">
            Compete in AI-judged coding battles
          </p>
        </div>

        {/* My Stats */}
        {isSignedIn && myRanking && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-[#eee]">
            {[
              { value: myRanking.eloRating, label: 'ELO Rating' },
              { value: myRanking.tier, label: 'Tier' },
              { value: myRanking.wins, label: 'Wins' },
              { value: myRanking.winStreak, label: 'Streak' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-[13px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">{stat.label}</div>
                <div className="text-[31px] font-semibold text-[#111]">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5">
          {['leaderboard', 'battle', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              data-testid={`arena-tab-${tab}-btn`}
              className={`px-4 py-2 text-base font-medium rounded transition-colors ${
                activeTab === tab
                  ? 'bg-[#111] text-white'
                  : 'bg-[#f8f9fa] text-[#666] border border-[#eee] hover:border-[#aaa] hover:text-[#111]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {activeTab === 'leaderboard' && (
            <LeaderboardTable initialLeaderboard={initialLeaderboard} />
          )}

          {activeTab === 'battle' && (
            canBattle ? (
              <ChallengeForm />
            ) : (
              <div className="py-16 text-center">
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">Battle</div>
                <h3 className="text-[20px] font-semibold text-[#111] mb-2">Start Battling</h3>
                <p className="text-base text-[#666] mb-8 max-w-md mx-auto">
                  Upgrade to challenge other developers in AI-judged coding battles.
                </p>
                <button className="px-6 py-2.5 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors">
                  Upgrade to Battle
                </button>
              </div>
            )
          )}

          {activeTab === 'history' && (
            canBattle ? (
              <BattleAnalysis />
            ) : (
              <div className="py-16 text-center">
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">History</div>
                <h3 className="text-[20px] font-semibold text-[#111] mb-2">Battle History</h3>
                <p className="text-base text-[#666] mb-8 max-w-md mx-auto">
                  Upgrade to view your detailed battle history and AI analysis.
                </p>
                <button className="px-6 py-2.5 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors">
                  Upgrade to View History
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
