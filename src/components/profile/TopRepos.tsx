import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star } from 'lucide-react';
import type { ScoredRepo } from '@/lib/types/profile';
import Link from 'next/link';

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
            <div key={index} className="group relative">
              <div className="border rounded-lg p-4 space-y-3 transition-all duration-150 group-hover:shadow-lg group-hover:border-blue-500 group-hover:bg-blue-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">
                        <span className="flex items-center gap-1">
                          {repo.name}
                        </span>
                      </h4>
                      <Badge className={`text-xs ${getSignificanceColor(repo.significanceScore)}`}>
                        Significance: {repo.significanceScore}/10
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {repo.description || 'No description available'}
                    </p>
                  </div>
                  {/* External GitHub link positioned in top-right */}
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-blue-600 transition-colors duration-150 p-1 rounded-sm hover:bg-blue-50 z-10"
                    title="View on GitHub"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    <strong>Why this repository is significant:</strong>
                  </p>
                  <p className="text-xs italic">
                    &ldquo;{repo.reason}&rdquo;
                  </p>
                </div>
                {/* Local navigation link covering the entire card */}
                <Link
                  href={`/${repo.owner}/${repo.repo}/scorecard`}
                  className="absolute inset-0 z-0"
                  aria-label={`View scorecard for ${repo.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 