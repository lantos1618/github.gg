"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

  const statusColor = isPending ? '#f59e0b' : isWinner ? '#34a853' : '#ea4335';
  const statusLabel = isPending ? battle.status.replace('_', ' ') : isWinner ? 'Victory' : 'Defeat';

  return (
    <div data-testid="arena-battle-card" className="border-b border-[#f0f0f0] last:border-0">
      <div className="py-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[14px] font-medium text-[#111]">
              {battle.challengerUsername} <span className="text-[#ccc] mx-1">vs</span> {opponentUsername}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[12px] font-semibold uppercase tracking-[1px]" style={{ color: statusColor }}>
                {isPending ? battle.status.replace('_', ' ') : 'Completed'}
              </span>
              <span className="text-[12px] text-[#aaa]">
                {isCompleted && battle.completedAt
                  ? new Date(battle.completedAt).toLocaleDateString()
                  : new Date(battle.createdAt).toLocaleDateString()
                }
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[16px] font-semibold uppercase tracking-[0.5px]" style={{ color: statusColor }}>
              {isPending ? '...' : statusLabel}
            </div>
            <div className="text-[12px] text-[#aaa] font-mono mt-0.5">
              {isPending ? '' : (isCompleted && battle.eloChange) ? `${battle.eloChange.challenger.change > 0 ? '+' : ''}${battle.eloChange.challenger.change} ELO` : ''}
            </div>
          </div>
        </div>

        {battle.criteria && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {battle.criteria.map((criterion) => (
              <span key={criterion} className="px-2 py-0.5 bg-[#f8f9fa] text-[12px] text-[#888] border border-[#eee] rounded capitalize">
                {criterion.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="w-full flex items-center justify-between py-2 text-[14px] font-medium text-[#888] hover:text-[#111] transition-colors">
            <span>View Analysis</span>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-4">
            {battle.scores && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[12px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">Challenger</div>
                  <div className="text-[24px] font-semibold text-[#111]">{battle.scores.challenger.total.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">Opponent</div>
                  <div className="text-[24px] font-semibold text-[#111]">{battle.scores.opponent.total.toFixed(1)}</div>
                </div>
              </div>
            )}

            {battle.scores && (
              <div>
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">Score Breakdown</div>
                <table className="w-full text-[14px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#ddd]">
                      <td className="py-1.5 text-[12px] text-[#aaa] font-semibold">Criterion</td>
                      <td className="py-1.5 text-[12px] text-[#aaa] font-semibold text-right">You</td>
                      <td className="py-1.5 text-[12px] text-[#aaa] font-semibold text-right">Opp</td>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(battle.scores.challenger.breakdown).map(([criterion, score]) => (
                      <tr key={criterion} className="border-b border-[#f0f0f0]">
                        <td className="py-2 text-[#666] capitalize">{criterion.replace('_', ' ')}</td>
                        <td className="py-2 text-right font-mono text-[#111]">{score.toFixed(1)}</td>
                        <td className="py-2 text-right font-mono text-[#111]">{(battle.scores!.opponent.breakdown as Record<string, number>)[criterion]?.toFixed(1) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {battle.aiAnalysis && (
              <div className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #4285f4' }}>
                <div className="text-[12px] font-semibold uppercase tracking-[1px] text-[#4285f4] mb-1">AI Verdict</div>
                <div className="text-[14px] text-[#333] leading-[1.6]">
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
