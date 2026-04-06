'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ScorecardMetric } from '@/lib/types/scorecard';

type SortField = 'date' | 'score' | 'name';
type SortOrder = 'asc' | 'desc';

interface RepositoryScorecardEntry {
  repoOwner: string;
  repoName: string;
  overallScore: number;
  updatedAt: Date | string;
  metrics: ScorecardMetric[];
  ref: string | null;
  version: number;
}

interface ReposClientViewProps {
  initialRepos: RepositoryScorecardEntry[];
  totalRepoCount: number;
}

export function ReposClientView({ initialRepos, totalRepoCount }: ReposClientViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const filteredRepos = initialRepos?.filter(repo =>
    `${repo.repoOwner}/${repo.repoName}`.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const comparators: Record<SortField, (a: RepositoryScorecardEntry, b: RepositoryScorecardEntry) => number> = {
    date: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    score: (a, b) => (b.overallScore || 0) - (a.overallScore || 0),
    name: (a, b) => `${a.repoOwner}/${a.repoName}`.localeCompare(`${b.repoOwner}/${b.repoName}`),
  };

  const sortedRepos = [...filteredRepos].sort((a, b) => {
    const comparison = comparators[sortField](a, b);
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  const totalPages = Math.ceil(sortedRepos.length / pageSize);
  const paginatedRepos = sortedRepos.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">
              Repositories
              <span className="text-base font-normal text-[#888] ml-3">{totalRepoCount.toLocaleString()}</span>
            </h1>
          </div>
          <div className="relative w-64 flex-shrink-0">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ccc]" />
            <Input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-6"
            />
          </div>
        </div>

        {paginatedRepos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base text-[#aaa]">{searchQuery ? 'No repositories found.' : 'No analyzed repositories yet.'}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-base border-collapse">
              <thead>
                <tr className="border-b border-[#ddd]">
                  <td className="py-2 text-xs text-[#999] font-semibold cursor-pointer hover:text-[#111] transition-colors" onClick={() => toggleSort('name')}>
                    <span className="inline-flex items-center gap-1">Repository {sortField === 'name' && <ArrowUpDown className="h-3 w-3" />}</span>
                  </td>
                  <td className="py-2 text-xs text-[#999] font-semibold text-center cursor-pointer hover:text-[#111] transition-colors hidden lg:table-cell" onClick={() => toggleSort('score')}>
                    <span className="inline-flex items-center gap-1">Score {sortField === 'score' && <ArrowUpDown className="h-3 w-3" />}</span>
                  </td>
                  <td className="py-2 text-xs text-[#999] font-semibold text-right cursor-pointer hover:text-[#111] transition-colors hidden sm:table-cell" onClick={() => toggleSort('date')}>
                    <span className="inline-flex items-center gap-1">Analyzed {sortField === 'date' && <ArrowUpDown className="h-3 w-3" />}</span>
                  </td>
                </tr>
              </thead>
              <tbody>
                {paginatedRepos.map((repo) => {
                  const fullName = `${repo.repoOwner}/${repo.repoName}`;
                  return (
                    <tr key={`${fullName}-${repo.ref}-${repo.version}`} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                      <td className="py-3">
                        <Link href={`/${fullName}/scorecard`} className="group">
                          <span className="font-medium text-[#111] group-hover:text-[#666] transition-colors">{fullName}</span>
                          {repo.ref !== 'main' && repo.ref !== 'master' && repo.ref && (
                            <span className="ml-2 text-[13px] font-mono text-[#aaa]">{repo.ref}</span>
                          )}
                        </Link>
                      </td>
                      <td className="py-3 text-center hidden lg:table-cell">
                        <Link href={`/${fullName}/scorecard`}>
                          {repo.overallScore !== null ? (
                            <span className="font-semibold text-[#111]">{repo.overallScore}<span className="text-[13px] text-[#aaa] ml-0.5">/100</span></span>
                          ) : (
                            <span className="text-[#ccc]">N/A</span>
                          )}
                        </Link>
                      </td>
                      <td className="py-3 text-right hidden sm:table-cell">
                        <Link href={`/${fullName}/scorecard`} className="text-base text-[#888]">
                          {formatDistanceToNow(new Date(repo.updatedAt), { addSuffix: true })}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button onClick={() => setPage(page - 1)} disabled={page === 0} className="px-3 py-1.5 text-base font-medium text-[#666] border border-[#ddd] rounded hover:border-[#111] hover:text-[#111] transition-colors disabled:opacity-30">
                  Previous
                </button>
                <span className="text-base text-[#aaa] font-mono">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={page === totalPages - 1} className="px-3 py-1.5 text-base font-medium text-[#666] border border-[#ddd] rounded hover:border-[#111] hover:text-[#111] transition-colors disabled:opacity-30">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
