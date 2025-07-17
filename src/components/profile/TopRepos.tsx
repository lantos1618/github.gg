import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star } from 'lucide-react';
import type { ScoredRepo } from '@/lib/types/profile';

interface TopReposProps {
  repos: ScoredRepo[];
}

export function TopRepos({ repos }: TopReposProps) {
  const getSignificanceColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-blue-100 text-blue-800';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Top Repositories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {repos.map((repo, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">
                      <a 
                        href={repo.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 transition-colors flex items-center gap-1"
                      >
                        {repo.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </h4>
                    <Badge className={`text-xs ${getSignificanceColor(repo.significanceScore)}`}>
                      Significance: {repo.significanceScore}/10
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {repo.description || 'No description available'}
                  </p>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  <strong>Why this repository is significant:</strong>
                </p>
                <p className="text-xs italic">
                  &ldquo;{repo.reason}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 