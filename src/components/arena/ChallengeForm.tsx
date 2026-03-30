"use client";

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import { User, Check } from 'lucide-react';
import type { BattleCriteria } from '@/lib/types/arena';
import { DEFAULT_BATTLE_CRITERIA } from '@/lib/constants/arena';
import { sanitizeText, sanitizeArray } from '@/lib/utils/sanitize';
import { toast } from 'sonner';

const CRITERIA_LABELS: Record<BattleCriteria, { label: string; description: string }> = {
  code_quality: { label: 'Code Quality', description: 'Clean, maintainable, and well-structured code' },
  project_complexity: { label: 'Project Complexity', description: 'Sophisticated and challenging projects' },
  skill_diversity: { label: 'Skill Diversity', description: 'Range of technologies and languages' },
  innovation: { label: 'Innovation', description: 'Creative solutions and novel approaches' },
  documentation: { label: 'Documentation', description: 'Quality of READMEs and code comments' },
  testing: { label: 'Testing', description: 'Test coverage and testing practices' },
  architecture: { label: 'Architecture', description: 'System design and architectural patterns' },
  performance: { label: 'Performance', description: 'Optimization and efficiency' },
  security: { label: 'Security', description: 'Security best practices and awareness' },
  maintainability: { label: 'Maintainability', description: 'Code maintainability and scalability' },
};

interface BattleResult {
  error?: string;
  analysis?: { winner: string; reason: string; highlights: string[]; recommendations: string[] };
  battle?: { id: string; scores: { challenger: { total: number; breakdown: Record<string, number> }; opponent: { total: number; breakdown: Record<string, number> } } | null };
  eloChange?: { challenger: { change: number; newRating: number }; opponent: { change: number; newRating: number } };
}

export function ChallengeForm() {
  const searchParams = useSearchParams();
  const [opponentUsername, setOpponentUsername] = useState('');
  const [selectedCriteria, setSelectedCriteria] = useState<BattleCriteria[]>([...DEFAULT_BATTLE_CRITERIA]);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const activeToastId = useRef<string | number | null>(null);

  const challengeMutation = trpc.arena.challengeDeveloper.useMutation();
  const { data: currentUser } = trpc.me.useQuery(undefined, { refetchOnWindowFocus: false, staleTime: 2 * 60 * 1000 });

  useEffect(() => {
    return () => { if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; } };
  }, []);

  useEffect(() => {
    const opponentFromQuery = searchParams.get('opponent');
    if (opponentFromQuery) setOpponentUsername(opponentFromQuery);
  }, [searchParams]);

  const handleChallenge = async () => {
    if (!opponentUsername.trim()) return;
    if (currentUser?.user?.name === opponentUsername.trim()) { setBattleResult({ error: 'You cannot challenge yourself!' }); return; }

    try {
      setBattleResult(null); setIsBattling(true); setProgress(0); setStatusMessage('Creating battle challenge...');
      const toastId = toast.loading('Creating battle challenge...'); activeToastId.current = toastId;

      const battle = await challengeMutation.mutateAsync({ opponentUsername: opponentUsername.trim(), criteria: selectedCriteria });
      const eventSource = new EventSource(`/api/arena/battle?battleId=${battle.id}`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('progress', (event) => {
        try { const data = JSON.parse(event.data); setProgress(data.progress || 0); const message = sanitizeText(data.message); setStatusMessage(message); if (activeToastId.current) toast.loading(`${message} (${data.progress || 0}%)`, { id: activeToastId.current }); } catch (error) { console.error('Failed to parse progress:', error); }
      });

      eventSource.addEventListener('complete', (event) => {
        try {
          const data = JSON.parse(event.data); setProgress(100); setIsBattling(false); eventSource.close();
          if (activeToastId.current) { toast.success('Battle complete!', { id: activeToastId.current }); activeToastId.current = null; }
          setBattleResult({ battle: { id: battle.id, scores: { challenger: data.result?.challengerScore, opponent: data.result?.opponentScore } }, analysis: { winner: sanitizeText(data.result?.winner) || 'Unknown', reason: sanitizeText(data.result?.reason) || '', highlights: sanitizeArray(data.result?.highlights), recommendations: sanitizeArray(data.result?.recommendations) }, eloChange: data.result?.eloChange });
          setOpponentUsername(''); setSelectedCriteria([...DEFAULT_BATTLE_CRITERIA]);
        } catch (error) { console.error('Failed to parse complete:', error); setIsBattling(false); eventSource.close(); if (activeToastId.current) { toast.error('Failed to process results', { id: activeToastId.current }); activeToastId.current = null; } setBattleResult({ error: 'Battle completed but failed to parse results' }); }
      });

      eventSource.addEventListener('error', (event) => {
        try { const messageEvent = event as MessageEvent; const data = messageEvent.data ? JSON.parse(messageEvent.data) : {}; setIsBattling(false); eventSource.close(); const errorMsg = sanitizeText(data.message) || 'Battle failed.'; if (activeToastId.current) { toast.error(errorMsg, { id: activeToastId.current }); activeToastId.current = null; } setBattleResult({ error: errorMsg }); } catch { setIsBattling(false); eventSource.close(); if (activeToastId.current) { toast.error('An error occurred', { id: activeToastId.current }); activeToastId.current = null; } setBattleResult({ error: 'An error occurred during the battle' }); }
      });

      eventSource.onerror = () => { setIsBattling(false); eventSource.close(); if (activeToastId.current) { toast.error('Connection lost', { id: activeToastId.current }); activeToastId.current = null; } setBattleResult({ error: 'Connection error. Please try again.' }); };
    } catch (error) {
      console.error('Battle failed:', error); if (activeToastId.current) { toast.error(error instanceof Error ? error.message : 'Unknown error', { id: activeToastId.current }); activeToastId.current = null; }
      setBattleResult({ error: error instanceof Error ? error.message : 'Unknown error' }); setIsBattling(false);
    }
  };

  const handleCriteriaToggle = (criterion: BattleCriteria) => {
    setSelectedCriteria(prev => prev.includes(criterion) ? prev.filter(c => c !== criterion) : [...prev, criterion]);
  };

  const isFormValid = opponentUsername.trim() && selectedCriteria.length > 0 && currentUser?.user?.name !== opponentUsername.trim();
  const isPending = challengeMutation.isPending || isBattling;

  return (
    <div className="space-y-8">
      {/* Battle Result */}
      {battleResult && (
        <div>
          {battleResult.error ? (
            <div className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #ea4335' }}>
              <div className="text-[12px] font-semibold uppercase tracking-[1px] text-[#ea4335] mb-1">Battle Failed</div>
              <div className="text-[14px] text-[#333] leading-[1.6] mb-3">{battleResult.error}</div>
              <button onClick={() => setBattleResult(null)} className="text-[14px] text-[#888] hover:text-[#111] transition-colors">Try Again</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">Battle Complete</div>
                <h3 className="text-[28px] font-semibold text-[#111]">Winner: {battleResult.analysis?.winner}</h3>
                <p className="text-[14px] text-[#666] leading-[1.6] max-w-lg mx-auto mt-2">{battleResult.analysis?.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
                <div>
                  <div className="text-[12px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">You</div>
                  <div className="text-[28px] font-semibold text-[#111]">{battleResult.battle?.scores?.challenger?.total || 0}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">Opponent</div>
                  <div className="text-[28px] font-semibold text-[#111]">{battleResult.battle?.scores?.opponent?.total || 0}</div>
                </div>
              </div>

              {battleResult.analysis?.highlights && battleResult.analysis.highlights.length > 0 && (
                <div>
                  <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">Key Highlights</div>
                  <div className="space-y-1.5">
                    {battleResult.analysis.highlights.map((h: string, i: number) => (
                      <div key={i} className="text-[14px] text-[#666] leading-[1.6] flex gap-2">
                        <span className="text-[#34a853] flex-shrink-0">{i + 1}.</span> {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center">
                <button onClick={() => setBattleResult(null)} className="px-4 py-2 bg-[#f8f9fa] text-[#333] text-[14px] font-medium rounded border border-[#ddd] hover:border-[#111] transition-colors">
                  Challenge Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {!battleResult && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">Challenge</div>
            <h2 className="text-[22px] font-semibold text-[#111] mb-1">Challenge a Developer</h2>
            <p className="text-[14px] text-[#666]">Enter a GitHub username to initiate an AI-judged code battle.</p>
          </div>

          <div className="space-y-6">
            {/* Opponent Input */}
            <div>
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">Opponent</div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ccc]" />
                <Input
                  placeholder="e.g. torvalds, tj, antfu"
                  value={opponentUsername}
                  onChange={(e) => setOpponentUsername(e.target.value)}
                  disabled={isPending}
                  className="pl-10 h-11 text-[14px] border border-[#ddd] rounded focus:border-[#111] focus:ring-0 placeholder:text-[#ccc]"
                />
              </div>
              {currentUser?.user?.name === opponentUsername.trim() && (
                <p className="text-[12px] text-[#ea4335] mt-1">You cannot challenge yourself!</p>
              )}
            </div>

            {/* Criteria Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase">Battle Criteria</div>
                <span className="text-[12px] text-[#aaa]">{selectedCriteria.length} selected</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
                {Object.entries(CRITERIA_LABELS).map(([key, info]) => {
                  const criterion = key as BattleCriteria;
                  const isSelected = selectedCriteria.includes(criterion);
                  return (
                    <div
                      key={criterion}
                      className={`py-[12px] px-[14px] cursor-pointer transition-colors ${isSelected ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] hover:bg-[#eee]'}`}
                      style={isSelected ? {} : { borderLeft: '3px solid transparent' }}
                      onClick={() => handleCriteriaToggle(criterion)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${isSelected ? 'border-white bg-white' : 'border-[#ccc]'}`}>
                          {isSelected && <Check className="h-3 w-3 text-[#111]" />}
                        </div>
                        <div>
                          <div className={`text-[14px] font-medium ${isSelected ? 'text-white' : 'text-[#111]'}`}>{info.label}</div>
                          <div className={`text-[12px] ${isSelected ? 'text-white/60' : 'text-[#aaa]'}`}>{info.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleChallenge}
              disabled={!isFormValid || isPending}
              data-testid="arena-challenge-start-btn"
              className={`w-full py-3 bg-[#111] text-white text-[14px] font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-50 ${isPending ? 'animate-pulse' : ''}`}
            >
              Start Battle
            </button>

            {isBattling && (
              <div className="space-y-2 text-center">
                <div className="h-1 w-full bg-[#eee] overflow-hidden">
                  <div className="h-full bg-[#111] transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[12px] text-[#888]">{statusMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
