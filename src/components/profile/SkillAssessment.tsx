import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { ScoredMetric } from '@/lib/types/profile';

interface SkillAssessmentProps {
  skills: ScoredMetric[];
}

export function SkillAssessment({ skills }: SkillAssessmentProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return 'default' as const;
    if (score >= 6) return 'secondary' as const;
    if (score >= 4) return 'outline' as const;
    return 'destructive' as const;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 Skill Assessment
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="bg-white text-black border border-gray-200 shadow-lg">
                <p className="text-black">AI-assessed skills based on repository analysis</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {skills.map((skill, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{skill.metric}</h4>
                  <Badge variant={getScoreBadgeVariant(skill.score)} className="text-xs">
                    {skill.score}/10
                  </Badge>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(skill.score)}`}>
                  {skill.score}/10
                </span>
              </div>
              
              <Progress value={skill.score * 10} className="h-2" />
              
              <p className="text-xs text-muted-foreground italic line-clamp-2">
                &ldquo;{skill.reason}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 