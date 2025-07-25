"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <Card className={`border-2 ${isWinner ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isWinner ? 'bg-green-100' : 'bg-red-100'}`}>
              {isWinner ? (
                <Trophy className="h-5 w-5 text-green-600" />
              ) : (
                <Sword className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {battle.challengerUsername} vs {opponentUsername}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  Battle
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(battle.completedAt!).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
              {isWinner ? 'VICTORY' : 'DEFEAT'}
            </div>
            <div className="text-sm text-muted-foreground">
              ELO: {battle.eloChange ? (battle.eloChange.challenger.change > 0 ? '+' : '') + battle.eloChange.challenger.change : 'N/A'}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Battle Criteria */}
        {battle.criteria && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Battle Criteria:</h4>
            <div className="flex flex-wrap gap-1">
              {battle.criteria.map((criterion) => (
                <Badge key={criterion} variant="outline" className="text-xs">
                  {criterion.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Battle Analysis */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto">
              <span>Battle Analysis</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {/* AI Analysis */}
            {battle.aiAnalysis && (
              <div className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium mb-2">AI Judge&apos;s Decision</h5>
                <div className="prose prose-sm max-w-none space-y-3">
                  {/* Handle different AI analysis formats */}
                  {typeof battle.aiAnalysis === 'string' ? (
                    <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {battle.aiAnalysis}
                    </div>
                  ) : (
                    <>
                      {/* Winner */}
                      {battle.aiAnalysis.winner && (
                        <div>
                          <h6 className="font-medium text-green-600">Winner: {battle.aiAnalysis.winner}</h6>
                        </div>
                      )}
                      
                      {/* Reason */}
                      {battle.aiAnalysis.reason && (
                        <div>
                          <h6 className="font-medium mb-1">Analysis:</h6>
                          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {battle.aiAnalysis.reason}
                          </div>
                        </div>
                      )}
                      
                      {/* Highlights */}
                      {battle.aiAnalysis.highlights && Array.isArray(battle.aiAnalysis.highlights) && battle.aiAnalysis.highlights.length > 0 && (
                        <div>
                          <h6 className="font-medium mb-1">Key Highlights:</h6>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {battle.aiAnalysis.highlights.map((highlight: string, index: number) => (
                              <li key={index}>{highlight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Recommendations */}
                      {battle.aiAnalysis.recommendations && Array.isArray(battle.aiAnalysis.recommendations) && battle.aiAnalysis.recommendations.length > 0 && (
                        <div>
                          <h6 className="font-medium mb-1">Recommendations:</h6>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {battle.aiAnalysis.recommendations.map((recommendation: string, index: number) => (
                              <li key={index}>{recommendation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Battle Stats */}
            {battle.scores && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-sm font-medium text-muted-foreground">Challenger Score</div>
                  <div className="text-lg font-bold">{battle.scores.challenger.total.toFixed(1)}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-sm font-medium text-muted-foreground">Opponent Score</div>
                  <div className="text-lg font-bold">{battle.scores.opponent.total.toFixed(1)}</div>
                </div>
              </div>
            )}

            {/* Repository Information */}
            {battle.aiAnalysis && typeof battle.aiAnalysis === 'object' && battle.aiAnalysis.repositories && (
              <div className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium mb-3">Repositories Analyzed</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {battle.challengerUsername} ({battle.aiAnalysis.repositories.challenger.total} repos)
                    </div>
                    <div className="space-y-1">
                      {battle.aiAnalysis.repositories.challenger.topRepos?.map((repo: string, index: number) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          • {repo}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {battle.opponentUsername} ({battle.aiAnalysis.repositories.opponent.total} repos)
                    </div>
                    <div className="space-y-1">
                      {battle.aiAnalysis.repositories.opponent.topRepos?.map((repo: string, index: number) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          • {repo}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Scores by Criteria */}
            {battle.scores && (
              <div className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium mb-3">Scores by Criteria</h5>
                <div className="space-y-2">
                  {Object.entries(battle.scores.challenger.breakdown).map(([criterion, score]) => (
                    <div key={criterion} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{criterion.replace('_', ' ')}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="font-medium">{score.toFixed(1)}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-medium">{(battle.scores!.opponent.breakdown as Record<string, number>)[criterion]?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
} 