"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Trophy, Sword, Target } from 'lucide-react';
import { useState } from 'react';
import type { ArenaBattle } from '@/lib/types/arena';

interface BattleCardProps {
  battle: ArenaBattle;
}

export function BattleCard({ battle }: BattleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isWinner = battle.winnerId === battle.challengerId;
  const opponentUsername = battle.opponentUsername;
  const isCompleted = battle.status === 'completed' && battle.completedAt;
  const isPending = battle.status === 'pending' || battle.status === 'in_progress';

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white hover:border-gray-200 transition-colors">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${isPending ? 'bg-yellow-50' : isWinner ? 'bg-green-50' : 'bg-red-50'}`}>
              {isPending ? (
                <Target className="h-6 w-6 text-yellow-600 animate-pulse" />
              ) : isWinner ? (
                <Trophy className="h-6 w-6 text-green-600" />
              ) : (
                <Sword className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-black">
                {battle.challengerUsername} <span className="text-gray-400 mx-1">vs</span> {opponentUsername}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${isPending ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {isPending ? battle.status.replace('_', ' ') : 'Completed'}
                </span>
                <span className="text-xs text-gray-400">
                  {isCompleted && battle.completedAt
                    ? new Date(battle.completedAt).toLocaleDateString()
                    : new Date(battle.createdAt).toLocaleDateString()
                  }
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${isPending ? 'text-yellow-600' : isWinner ? 'text-green-600' : 'text-red-600'}`}>
              {isPending ? '...' : isWinner ? 'VICTORY' : 'DEFEAT'}
            </div>
            <div className="text-sm text-gray-400 font-mono mt-1">
              {isPending ? 'Calculating...' : (isCompleted && battle.eloChange) ? `${battle.eloChange.challenger.change > 0 ? '+' : ''}${battle.eloChange.challenger.change} ELO` : ''}
            </div>
          </div>
        </div>

        {/* Battle Criteria */}
        {battle.criteria && (
          <div className="flex flex-wrap gap-2 mb-6">
            {battle.criteria.map((criterion) => (
              <span key={criterion} className="px-2 py-1 rounded bg-gray-50 text-xs text-gray-600 border border-gray-100 capitalize">
                {criterion.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Battle Analysis Trigger */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium">
              <span>View Analysis & Scores</span>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-6 px-2">
            {/* Battle Stats */}
            {battle.scores && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-gray-100 bg-white">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Challenger</div>
                  <div className="text-2xl font-bold">{battle.scores.challenger.total.toFixed(1)}</div>
                </div>
                <div className="p-4 rounded-lg border border-gray-100 bg-white">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Opponent</div>
                  <div className="text-2xl font-bold">{battle.scores.opponent.total.toFixed(1)}</div>
                </div>
              </div>
            )}

            {/* Detailed Scores */}
            {battle.scores && (
              <div className="space-y-3">
                <h5 className="font-bold text-sm text-black">Score Breakdown</h5>
                <div className="space-y-2">
                  {Object.entries(battle.scores.challenger.breakdown).map(([criterion, score]) => (
                    <div key={criterion} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                      <span className="capitalize text-gray-600">{criterion.replace('_', ' ')}</span>
                      <div className="flex gap-6 font-mono">
                        <span className="font-medium">{score.toFixed(1)}</span>
                        <span className="text-gray-300">|</span>
                        <span className="font-medium">{(battle.scores!.opponent.breakdown as Record<string, number>)[criterion]?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {battle.aiAnalysis && (
              <div className="space-y-3">
                <h5 className="font-bold text-sm text-black">AI Verdict</h5>
                <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {typeof battle.aiAnalysis === 'string' ? battle.aiAnalysis : battle.aiAnalysis.reason}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
