import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Code2 } from 'lucide-react';
import type { ScoredMetric } from '@/lib/types/profile';

interface DevelopmentStyleProps {
  traits: ScoredMetric[];
}

export function DevelopmentStyle({ traits }: DevelopmentStyleProps) {
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
          <Code2 className="h-5 w-5" />
          Development Style
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Code2 className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="bg-white text-black border border-gray-200 shadow-lg">
                <p className="text-black">Analysis of coding habits and contribution patterns</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {traits.map((trait, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{trait.metric}</h4>
                  <Badge variant={getScoreBadgeVariant(trait.score)} className="text-xs">
                    {trait.score}/10
                  </Badge>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(trait.score)}`}>
                  {trait.score}/10
                </span>
              </div>
              
              <Progress value={trait.score * 10} className="h-2" />
              
              <p className="text-xs text-muted-foreground italic line-clamp-2">
                &ldquo;{trait.reason}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 