'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface SimilarReposRailProps {
  owner: string;
  repo: string;
  limit?: number;
}

// Renders nothing when no embedding exists for the source repo or no
// neighbours found — so it's safe to drop unconditionally into a scorecard
// view, even for fresh / private / un-embedded repos.
export function SimilarReposRail({ owner, repo, limit = 6 }: SimilarReposRailProps) {
  const { data, isLoading } = trpc.repoSearch.getSimilarRepos.useQuery(
    { owner, repo, limit },
    { staleTime: 5 * 60_000 }
  );

  if (isLoading) return null;
  if (!data || data.results.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-[#eee]">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-[#888]" />
        <h2 className="text-base font-semibold text-[#111]">Similar projects</h2>
        <span className="text-xs text-[#aaa]">ranked by semantic similarity</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.results.map((r) => {
          const fullName = `${r.repoOwner}/${r.repoName}`;
          return (
            <Link
              key={`${fullName}-${r.version}`}
              href={`/${fullName}/scorecard`}
              className="block p-3 border border-[#eee] rounded-md hover:border-[#111] transition-colors group"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-[#111] truncate group-hover:text-[#666] transition-colors">
                  {fullName}
                </span>
                <span className="text-xs font-mono text-[#888] flex-shrink-0">
                  {Math.round(r.similarityScore * 100)}%
                </span>
              </div>
              <div className="text-xs text-[#888] mt-1">
                Score <span className="font-semibold text-[#111]">{r.overallScore}</span>
                <span className="text-[#ccc]">/100</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
