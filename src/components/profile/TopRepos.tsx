import { ExternalLink } from 'lucide-react';
import type { ScoredRepo } from '@/lib/types/profile';
import Link from 'next/link';

interface TopReposProps {
  repos: ScoredRepo[];
  compact?: boolean;
  username?: string;
}

export function TopRepos({ repos, compact = false, username }: TopReposProps) {
  if (compact) {
    return (
      <div className="space-y-3">
        {repos.slice(0, 5).map((repo, idx) => (
          <div key={idx} className="flex items-start justify-between pb-3 border-b border-[#f0f0f0] last:border-0 last:pb-0">
            <div>
              <a
                href={repo.url || `https://github.com/${username}/${repo.repo || repo.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium text-[#111] hover:text-[#666] transition-colors"
              >
                {repo.name}
              </a>
              <p className="text-[13px] text-[#aaa] mt-0.5">{repo.description}</p>
            </div>
            <div className="text-base font-semibold text-[#111] flex-shrink-0 ml-4">
              {repo.significanceScore}/10
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="profile-top-repos">
      {repos.map((repo, index) => {
        // Pick a color based on score
        const scoreColor = repo.significanceScore >= 8 ? '#34a853'
          : repo.significanceScore >= 6 ? '#f59e0b'
          : '#6b7280';

        return (
          <div key={index} data-testid="profile-repo-card" className="group relative flex border-b border-[#f0f0f0] last:border-0">
            {/* Score indicator */}
            <div
              className="min-w-[32px] text-[20px] font-bold pt-[14px]"
              style={{ color: scoreColor }}
            >
              {repo.significanceScore}
            </div>

            {/* Content */}
            <div
              className="bg-[#f8f9fa] py-[14px] px-[16px] flex-1 mb-[2px]"
              style={{ borderLeft: `3px solid ${scoreColor}` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-medium text-[#111] group-hover:text-[#666] transition-colors mb-1">
                    {repo.name}
                  </div>
                  <div className="text-base text-[#666] leading-[1.6] mb-2">
                    {repo.description || 'No description available'}
                  </div>
                  {repo.reason && (
                    <div className="text-[13px] text-[#888] italic">
                      &ldquo;{repo.reason}&rdquo;
                    </div>
                  )}
                </div>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:flex items-center gap-1.5 text-[13px] text-[#aaa] hover:text-[#111] transition-colors flex-shrink-0 mt-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View
                </a>
              </div>
            </div>

            {/* Full card link */}
            <Link
              href={`/${repo.owner}/${repo.repo}/scorecard`}
              className="absolute inset-0 z-0"
              aria-label={`View scorecard for ${repo.name}`}
            />
          </div>
        );
      })}
    </div>
  );
}
