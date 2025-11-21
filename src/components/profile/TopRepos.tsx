import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { ScoredRepo } from '@/lib/types/profile';
import Link from 'next/link';

interface TopReposProps {
  repos: ScoredRepo[];
}

export function TopRepos({ repos }: TopReposProps) {
  return (
    <div className="space-y-6">
      {repos.map((repo, index) => (
        <div key={index} className="group relative border-b border-gray-100 pb-6 last:border-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 mb-1">
                <h4 className="font-bold text-lg text-black group-hover:text-blue-600 transition-colors">
                  {repo.name}
                </h4>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-mono font-medium text-gray-600">
                  Score: {repo.significanceScore}/10
                </div>
              </div>
              <p className="text-gray-600 mb-3 line-clamp-2">
                {repo.description || 'No description available'}
              </p>
              <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                 &ldquo;{repo.reason}&rdquo;
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 hidden sm:flex gap-2"
              asChild
            >
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Code
              </a>
            </Button>
          </div>
          {/* Local navigation link covering the entire card area */}
          <Link
            href={`/${repo.owner}/${repo.repo}/scorecard`}
            className="absolute inset-0 z-0"
            aria-label={`View scorecard for ${repo.name}`}
          />
        </div>
      ))}
    </div>
  );
}
