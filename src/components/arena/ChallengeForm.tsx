"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingWave } from '@/components/LoadingWave';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { trpc } from '@/lib/trpc/client';
import { Sword, Target, Zap, Users } from 'lucide-react';
import type { BattleCriteria } from '@/lib/types/arena';

const BATTLE_CRITERIA: { value: BattleCriteria; label: string; description: string }[] = [
  { value: 'code_quality', label: 'Code Quality', description: 'Clean, maintainable, and well-structured code' },
  { value: 'project_complexity', label: 'Project Complexity', description: 'Sophisticated and challenging projects' },
  { value: 'skill_diversity', label: 'Skill Diversity', description: 'Range of technologies and languages' },
  { value: 'innovation', label: 'Innovation', description: 'Creative solutions and novel approaches' },
  { value: 'documentation', label: 'Documentation', description: 'Quality of READMEs and code comments' },
  { value: 'testing', label: 'Testing', description: 'Test coverage and testing practices' },
  { value: 'architecture', label: 'Architecture', description: 'System design and architectural patterns' },
  { value: 'performance', label: 'Performance', description: 'Optimization and efficiency' },
  { value: 'security', label: 'Security', description: 'Security best practices and awareness' },
  { value: 'maintainability', label: 'Maintainability', description: 'Code maintainability and scalability' },
];

export function ChallengeForm() {
  const [opponentUsername, setOpponentUsername] = useState('');
  const [selectedCriteria, setSelectedCriteria] = useState<BattleCriteria[]>(['code_quality', 'project_complexity', 'skill_diversity', 'innovation']);
  const [battleType, setBattleType] = useState<'standard' | 'tournament' | 'friendly'>('standard');
  const [battleResult, setBattleResult] = useState<any>(null);

  // Challenge mutation
  const challengeMutation = trpc.arena.challengeDeveloper.useMutation();
  const executeMutation = trpc.arena.executeBattle.useMutation();

  const handleChallenge = async () => {
    if (!opponentUsername.trim()) return;

    try {
      // Create challenge
      const battle = await challengeMutation.mutateAsync({
        opponentUsername: opponentUsername.trim(),
        battleType,
        criteria: selectedCriteria,
      });

      // Execute battle immediately
      const result = await executeMutation.mutateAsync({
        battleId: battle.id,
      });

      // Reset form
      setOpponentUsername('');
      setSelectedCriteria(['code_quality', 'project_complexity', 'skill_diversity', 'innovation']);
      setBattleType('standard');

      // Show result inline
      setBattleResult(result);
    } catch (error) {
      console.error('Battle failed:', error);
      setBattleResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleCriteriaToggle = (criterion: BattleCriteria) => {
    setSelectedCriteria(prev => 
      prev.includes(criterion)
        ? prev.filter(c => c !== criterion)
        : [...prev, criterion]
    );
  };

  const isFormValid = opponentUsername.trim() && selectedCriteria.length > 0;
  const isPending = challengeMutation.isPending || executeMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Challenge Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="h-5 w-5" />
            Challenge a Developer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Opponent Selection */}
          <div className="space-y-2">
            <Label htmlFor="opponent">Opponent GitHub Username</Label>
            <Input
              id="opponent"
              placeholder="e.g., torvalds, tj, antfu"
              value={opponentUsername}
              onChange={(e) => setOpponentUsername(e.target.value)}
              disabled={isPending}
            />
            <p className="text-sm text-muted-foreground">
              Enter any GitHub username to challenge them to a battle! You can challenge any developer, whether they're registered on github.gg or not.
            </p>
          </div>

          {/* Battle Type */}
          <div className="space-y-2">
            <Label>Battle Type</Label>
            <div className="flex gap-2">
              {[
                { value: 'standard', label: 'Standard', icon: Target },
                { value: 'friendly', label: 'Friendly', icon: Users },
                { value: 'tournament', label: 'Tournament', icon: Zap },
              ].map((type) => (
                <Button
                  key={type.value}
                  variant={battleType === type.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBattleType(type.value as any)}
                  disabled={isPending}
                  className="flex items-center gap-2"
                >
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Battle Criteria */}
          <div className="space-y-2">
            <Label>Battle Criteria (Select 3-7)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BATTLE_CRITERIA.map((criterion) => (
                <div key={criterion.value} className="flex items-start space-x-2">
                  <Checkbox
                    id={criterion.value}
                    checked={selectedCriteria.includes(criterion.value)}
                    onCheckedChange={() => handleCriteriaToggle(criterion.value)}
                    disabled={isPending}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={criterion.value} className="text-sm font-medium">
                      {criterion.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {criterion.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Selected: {selectedCriteria.length} criteria
            </p>
          </div>

          {/* Error Display */}
          {(challengeMutation.error || executeMutation.error) && (
            <ErrorDisplay
              error={challengeMutation.error?.message || executeMutation.error?.message || 'Battle failed'}
              isPending={isPending}
              onRetry={handleChallenge}
            />
          )}

          {/* Challenge Button */}
          <Button
            onClick={handleChallenge}
            disabled={!isFormValid || isPending}
            className="w-full"
            size="lg"
          >
            {isPending ? (
              <>
                <LoadingWave size="sm" />
                Executing Battle...
              </>
            ) : (
              <>
                <Sword className="h-4 w-4 mr-2" />
                Challenge to Battle!
              </>
            )}
          </Button>

          {/* Inline Battle Result */}
          {battleResult && (
            <div className="mt-6 p-4 border rounded bg-muted">
              {battleResult.error ? (
                <div className="text-red-600 font-medium">{battleResult.error}</div>
              ) : (
                <>
                  <div className="font-bold mb-2">Battle Result</div>
                  <div className="mb-2">
                    <span className="font-medium">Winner:</span> {battleResult.analysis?.winner}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Reason:</span> {battleResult.analysis?.reason}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Challenger Score:</span> {battleResult.battle?.scores?.challenger?.total}
                    <span className="ml-4 font-medium">Opponent Score:</span> {battleResult.battle?.scores?.opponent?.total}
                  </div>
                  {/* Show analyzed repos */}
                  {battleResult.repositories && (
                    <div className="mb-2">
                      <span className="font-medium">Repositories Analyzed:</span>
                      <div className="text-xs mt-1">
                        <span className="font-semibold">You:</span> {battleResult.repositories.challenger.topRepos?.join(', ')}<br />
                        <span className="font-semibold">Opponent:</span> {battleResult.repositories.opponent.topRepos?.join(', ')}
                      </div>
                    </div>
                  )}
                  {/* Show highlights and recommendations */}
                  {battleResult.analysis?.highlights && battleResult.analysis.highlights.length > 0 && (
                    <div className="mb-2">
                      <span className="font-medium">Highlights:</span>
                      <ul className="list-disc list-inside text-xs">
                        {battleResult.analysis.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}
                  {battleResult.analysis?.recommendations && battleResult.analysis.recommendations.length > 0 && (
                    <div className="mb-2">
                      <span className="font-medium">Recommendations:</span>
                      <ul className="list-disc list-inside text-xs">
                        {battleResult.analysis.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Battle Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Target className="h-5 w-5" />
            How Battles Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-blue-700">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm">
              <strong>AI Analysis:</strong> Our AI analyzes both developers' repositories and profiles
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm">
              <strong>Fair Judging:</strong> Battles are judged on the criteria you select
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm">
              <strong>ELO System:</strong> Winners gain rating points, losers lose points
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm">
              <strong>Climb Rankings:</strong> Win battles to climb tiers and reach the top!
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm">
              <strong>Any GitHub User:</strong> Challenge any developer, even if they're not registered on github.gg
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 