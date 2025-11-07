"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Trophy,
  Sword,
  Target,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Award,
  TrendingUp,
  Users,
  RotateCcw
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import type { AiAnalysis } from '@/lib/types/arena';
import { LoadingPage } from '@/components/common';

export function BattleAnalysis() {
  const router = useRouter();
  const [expandedBattle, setExpandedBattle] = useState<string | null>(null);

  const { data: battleHistory, isLoading } = trpc.arena.getBattleHistory.useQuery({
    limit: 20,
    offset: 0,
  });

  const handleRematch = (opponentUsername: string) => {
    router.push(`/arena?tab=battle&opponent=${encodeURIComponent(opponentUsername)}`);
  };

  const toggleBattle = (battleId: string) => {
    setExpandedBattle(expandedBattle === battleId ? null : battleId);
  };

  const getEloChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getEloChangeIcon = (change: number) => {
    if (change > 0) return <Trophy className="h-3 w-3" />;
    if (change < 0) return <Sword className="h-3 w-3" />;
    return <Target className="h-3 w-3" />;
  };

  if (isLoading) {
    return <LoadingPage text="Loading battle history..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Battle Analysis</h2>
        <p className="text-muted-foreground">
          Review your past battles, analyze your performance, and learn from each encounter to improve your skills.
        </p>
      </div>

      {/* Battle List */}
      {battleHistory && battleHistory.length > 0 ? (
        <div className="space-y-4">
          {battleHistory.map((battle) => {
            const isExpanded = expandedBattle === battle.id;
            const isWinner = battle.winnerId === battle.challengerId;
            const eloChange = battle.eloChange?.challenger?.change || 0;
            const aiAnalysis = battle.aiAnalysis as AiAnalysis | null;

            return (
              <Card key={battle.id}>
                <CardContent className="p-6">
                  {/* Battle Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        isWinner ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {isWinner ? (
                          <Trophy className="h-5 w-5 text-green-600" />
                        ) : (
                          <Sword className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {battle.challengerUsername} vs {battle.opponentUsername}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {battle.completedAt ? new Date(battle.completedAt).toLocaleDateString() : new Date(battle.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {battle.criteria?.length || 0} criteria
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <Badge
                        variant={isWinner ? "default" : "destructive"}
                      >
                        {isWinner ? "VICTORY" : "DEFEAT"}
                      </Badge>
                      <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${getEloChangeColor(eloChange)}`}>
                        {getEloChangeIcon(eloChange)}
                        ELO: {eloChange !== 0 ? `${eloChange > 0 ? '+' : ''}${eloChange}` : 'N/A'}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRematch(battle.opponentUsername)}
                        className="w-full"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rematch
                      </Button>
                    </div>
                  </div>

                  {/* Battle Criteria */}
                  {battle.criteria && battle.criteria.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Battle Criteria</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {battle.criteria.map((criterion) => (
                          <Badge key={criterion} variant="outline" className="text-xs">
                            {criterion.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scores */}
                  {battle.scores && (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-sm text-muted-foreground">Your Score</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {battle.scores.challenger.total}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-sm text-muted-foreground">Opponent Score</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {battle.scores.opponent.total}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable Analysis */}
                  {aiAnalysis && (
                    <Collapsible open={isExpanded} onOpenChange={() => toggleBattle(battle.id)}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Battle Analysis
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4 space-y-4">
                        {/* Winner and Reason */}
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="h-4 w-4 text-yellow-600" />
                            <span className="font-semibold">Winner: {aiAnalysis.winner}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{aiAnalysis.reason}</p>
                        </div>

                        {/* Highlights */}
                        {aiAnalysis.highlights && aiAnalysis.highlights.length > 0 && (
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold">Key Highlights</span>
                            </div>
                            <ul className="space-y-2">
                              {aiAnalysis.highlights.map((highlight: string, index: number) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                  {highlight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-semibold">Recommendations</span>
                            </div>
                            <ul className="space-y-2">
                              {aiAnalysis.recommendations.map((rec: string, index: number) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Repository Analysis */}
                        {aiAnalysis.repositories && (
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="h-4 w-4 text-purple-600" />
                              <span className="font-semibold">Repositories Analyzed</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm font-medium mb-2">Your Top Repos</div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  {aiAnalysis.repositories.challenger.topRepos?.map((repo: string, index: number) => (
                                    <div key={index}>• {repo}</div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-medium mb-2">Opponent&apos;s Top Repos</div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  {aiAnalysis.repositories.opponent.topRepos?.map((repo: string, index: number) => (
                                    <div key={index}>• {repo}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sword className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Battles Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your journey by challenging another developer to your first battle!
            </p>
            <Button 
              onClick={() => window.location.hash = '#battle'} 
            >
              <Sword className="h-4 w-4 mr-2" />
              Start Your First Battle
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 