"use client";

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import {
  Sword,
  User,
  Sparkles,
  Trophy,
  X,
  Check,
  Target,
  Loader2
} from 'lucide-react';
import type { BattleCriteria } from '@/lib/types/arena';
import { DEFAULT_BATTLE_CRITERIA } from '@/lib/constants/arena';
import { sanitizeText, sanitizeArray } from '@/lib/utils/sanitize';

const CRITERIA_LABELS: Record<BattleCriteria, { label: string; description: string }> = {
  code_quality: { 
    label: 'Code Quality', 
    description: 'Clean, maintainable, and well-structured code' 
  },
  project_complexity: { 
    label: 'Project Complexity', 
    description: 'Sophisticated and challenging projects' 
  },
  skill_diversity: { 
    label: 'Skill Diversity', 
    description: 'Range of technologies and languages' 
  },
  innovation: { 
    label: 'Innovation', 
    description: 'Creative solutions and novel approaches' 
  },
  documentation: { 
    label: 'Documentation', 
    description: 'Quality of READMEs and code comments' 
  },
  testing: { 
    label: 'Testing', 
    description: 'Test coverage and testing practices' 
  },
  architecture: { 
    label: 'Architecture', 
    description: 'System design and architectural patterns' 
  },
  performance: { 
    label: 'Performance', 
    description: 'Optimization and efficiency' 
  },
  security: { 
    label: 'Security', 
    description: 'Security best practices and awareness' 
  },
  maintainability: { 
    label: 'Maintainability', 
    description: 'Code maintainability and scalability' 
  },
};

interface BattleResult {
  error?: string;
  analysis?: {
    winner: string;
    reason: string;
    highlights: string[];
    recommendations: string[];
  };
  battle?: {
    id: string;
    scores: {
      challenger: { 
        total: number;
        breakdown: Record<string, number>;
      };
      opponent: { 
        total: number;
        breakdown: Record<string, number>;
      };
    } | null;
  };
  eloChange?: {
    challenger: { change: number; newRating: number };
    opponent: { change: number; newRating: number };
  };
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

  const challengeMutation = trpc.arena.challengeDeveloper.useMutation();
  const { data: currentUser } = trpc.me.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  useEffect(() => {
    const opponentFromQuery = searchParams.get('opponent');
    if (opponentFromQuery) {
      setOpponentUsername(opponentFromQuery);
    }
  }, [searchParams]);

  const handleChallenge = async () => {
    if (!opponentUsername.trim()) return;

    // Prevent self-challenge
    if (currentUser?.user?.name === opponentUsername.trim()) {
      setBattleResult({ error: 'You cannot challenge yourself!' });
      return;
    }

    try {
      setBattleResult(null);
      setIsBattling(true);
      setProgress(0);
      setStatusMessage('Creating battle challenge...');

      // Create challenge
      const battle = await challengeMutation.mutateAsync({
        opponentUsername: opponentUsername.trim(),
        criteria: selectedCriteria,
      });

      // Connect to SSE endpoint for real-time progress
      const eventSource = new EventSource(`/api/arena/battle?battleId=${battle.id}`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('progress', (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgress(data.progress || 0);
          setStatusMessage(sanitizeText(data.message));
        } catch (error) {
          console.error('Failed to parse progress event:', error);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgress(100);
          setIsBattling(false);
          eventSource.close();

          setBattleResult({
            battle: {
              id: battle.id,
              scores: {
                challenger: data.result?.challengerScore,
                opponent: data.result?.opponentScore,
              },
            },
            analysis: {
              winner: sanitizeText(data.result?.winner) || 'Unknown',
              reason: sanitizeText(data.result?.reason) || '',
              highlights: sanitizeArray(data.result?.highlights),
              recommendations: sanitizeArray(data.result?.recommendations),
            },
            eloChange: data.result?.eloChange,
          });

          // Reset form
          setOpponentUsername('');
          setSelectedCriteria([...DEFAULT_BATTLE_CRITERIA]);
        } catch (error) {
          console.error('Failed to parse battle complete event:', error);
          setIsBattling(false);
          eventSource.close();
          setBattleResult({ error: 'Battle completed but failed to parse results' });
        }
      });

      eventSource.addEventListener('error', (event) => {
        try {
          const messageEvent = event as MessageEvent;
          const data = messageEvent.data ? JSON.parse(messageEvent.data) : {};
          setIsBattling(false);
          eventSource.close();

          setBattleResult({ error: sanitizeText(data.message) || 'Battle failed. Please try again.' });
        } catch (error) {
          console.error('Failed to parse error event:', error);
          setIsBattling(false);
          eventSource.close();
          setBattleResult({ error: 'An error occurred during the battle' });
        }
      });

      eventSource.onerror = () => {
        setIsBattling(false);
        eventSource.close();

        setBattleResult({ error: 'Connection error. Please try again.' });
      };

    } catch (error) {
      console.error('Battle failed:', error);
      setBattleResult({ error: error instanceof Error ? error.message : 'Unknown error' });
      setIsBattling(false);
    }
  };

  const handleCriteriaToggle = (criterion: BattleCriteria) => {
    setSelectedCriteria(prev => 
      prev.includes(criterion)
        ? prev.filter(c => c !== criterion)
        : [...prev, criterion]
    );
  };

  const isFormValid = opponentUsername.trim() && selectedCriteria.length > 0 && currentUser?.user?.name !== opponentUsername.trim();
  const isPending = challengeMutation.isPending || isBattling;

  return (
    <div className="space-y-8">
      {/* Battle Result */}
      {battleResult && (
        <div className={`p-8 rounded-2xl border-2 ${battleResult.error ? "border-red-100 bg-red-50/50" : "border-yellow-100 bg-yellow-50/30"}`}>
          {battleResult.error ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-xl">
                <X className="h-6 w-6" />
                Battle Failed
              </div>
              <p className="text-red-500">{battleResult.error}</p>
              <Button 
                variant="outline" 
                onClick={() => setBattleResult(null)}
                className="border-red-200 hover:bg-red-50 text-red-700"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-8 text-center">
              {/* Winner Announcement */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-100 text-yellow-800 rounded-full font-medium text-sm">
                  <Trophy className="h-4 w-4" />
                  Battle Complete
                </div>
                <h3 className="text-4xl font-bold text-black">
                  Winner: {battleResult.analysis?.winner} 🎉
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  {battleResult.analysis?.reason}
                </p>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
                <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-sm text-gray-500 uppercase tracking-wider font-medium mb-2">You</div>
                  <div className="text-4xl font-bold text-blue-600">
                    {battleResult.battle?.scores?.challenger?.total || 0}
                  </div>
                </div>
                <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-sm text-gray-500 uppercase tracking-wider font-medium mb-2">Opponent</div>
                  <div className="text-4xl font-bold text-purple-600">
                    {battleResult.battle?.scores?.opponent?.total || 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
                {/* Highlights */}
                {battleResult.analysis?.highlights && battleResult.analysis.highlights.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-black border-b border-gray-100 pb-2">Key Highlights</h4>
                    <ul className="space-y-3">
                      {battleResult.analysis.highlights.map((highlight: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-3">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {battleResult.analysis?.recommendations && battleResult.analysis.recommendations.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-black border-b border-gray-100 pb-2">Recommendations</h4>
                    <ul className="space-y-3">
                      {battleResult.analysis.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-3">
                          <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="h-12 px-8 border-gray-200 text-gray-700 hover:text-black hover:border-black"
                onClick={() => setBattleResult(null)}
              >
                Challenge Another Developer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main Form */}
      {!battleResult && (
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-50 mb-6">
              <Sword className="h-8 w-8 text-black" />
            </div>
            <h2 className="text-3xl font-bold text-black mb-3">Challenge a Developer</h2>
            <p className="text-gray-500">
              Enter a GitHub username to initiate an AI-judged code battle.
            </p>
          </div>

          <div className="space-y-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            {/* Opponent Input */}
            <div className="space-y-3">
              <Label htmlFor="opponent" className="text-base font-semibold text-black">Opponent Username</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="opponent"
                  placeholder="e.g. torvalds, tj, antfu"
                  value={opponentUsername}
                  onChange={(e) => setOpponentUsername(e.target.value)}
                  disabled={isPending}
                  className="pl-12 h-14 text-lg border-2 border-gray-100 rounded-xl focus:border-black bg-gray-50/30"
                />
              </div>
              {currentUser?.user?.name === opponentUsername.trim() && (
                <p className="text-sm text-red-600 font-medium">
                  You cannot challenge yourself!
                </p>
              )}
            </div>

            {/* Criteria Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-black">Battle Criteria</Label>
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                  {selectedCriteria.length} selected
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(CRITERIA_LABELS).map(([key, info]) => {
                  const criterion = key as BattleCriteria;
                  const isSelected = selectedCriteria.includes(criterion);
                  return (
                    <div
                      key={criterion}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-black border-black text-white shadow-md transform scale-[1.02]' 
                          : 'bg-white border-gray-100 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => handleCriteriaToggle(criterion)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected ? 'border-white bg-white text-black' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-black'}`}>
                            {info.label}
                          </div>
                          <div className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                            {info.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Challenge Button */}
            <Button
              onClick={handleChallenge}
              disabled={!isFormValid || isPending}
              size="lg"
              className="w-full h-16 text-lg font-bold bg-black hover:bg-gray-800 rounded-xl transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing Repositories...
                </>
              ) : (
                <>
                  <Sword className="h-5 w-5 mr-2" />
                  Start Battle
                </>
              )}
            </Button>

            {/* Progress Indicator */}
            {isBattling && (
              <div className="space-y-3 pt-4 text-center">
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
                <p className="text-sm font-medium text-blue-600 animate-pulse">{statusMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
