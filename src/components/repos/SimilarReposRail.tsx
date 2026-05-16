'use client';

import Link from 'next/link';
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
    <section className="mt-10">
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
        Similar Projects
      </div>
      <div className="border-b border-[#eee] mb-4" />
      <table className="w-full text-base border-collapse table-fixed">
        <tbody>
          {data.results.map((r) => {
            const fullName = `${r.repoOwner}/${r.repoName}`;
            return (
              <tr
                key={`${fullName}-${r.version}`}
                className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors"
              >
                <td className="py-3 w-[60%]">
                  <Link href={`/${fullName}/scorecard`} className="group block truncate">
                    <span className="font-medium text-[#111] group-hover:text-[#666] transition-colors">
                      {fullName}
                    </span>
                  </Link>
                </td>
                <td className="py-3 text-center hidden lg:table-cell w-[15%]">
                  <Link href={`/${fullName}/scorecard`}>
                    <span className="font-semibold text-[#111]">
                      {r.overallScore}
                      <span className="text-[13px] text-[#aaa] ml-0.5">/100</span>
                    </span>
                  </Link>
                </td>
                <td className="py-3 text-right w-[25%]">
                  <Link href={`/${fullName}/scorecard`} className="text-base text-[#888] font-mono text-[13px]">
                    {Math.round(r.similarityScore * 100)}%
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
