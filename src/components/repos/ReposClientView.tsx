'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
}

export function ReposClientView({ initialRepos }: ReposClientViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Filter repos
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

  // Paginate
  const totalPages = Math.ceil(sortedRepos.length / pageSize);
  const paginatedRepos = sortedRepos.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(0); // Reset to first page
  };

  return (
    <div className="min-h-screen bg-white pt-20 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
            <h1 className="text-5xl font-bold text-black tracking-tight mb-4">Analyzed Repositories</h1>
            <p className="text-xl text-gray-500 font-light max-w-2xl">
                Explore comprehensive code quality metrics and insights.
            </p>
        </div>

        {/* Search Control */}
        <div className="mb-12">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-12 h-14 text-lg border-2 border-gray-100 rounded-xl focus:border-black focus:ring-0 transition-colors"
            />
          </div>
        </div>

        {paginatedRepos.length === 0 ? (
          <div className="py-20 text-center border-t border-gray-100">
            <p className="text-gray-400 text-lg">
              {searchQuery ? 'No repositories found.' : 'No analyzed repositories yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th
                      className="py-6 pr-8 text-sm font-medium text-gray-500 cursor-pointer hover:text-black transition-colors"
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Repository
                        {sortField === 'name' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="py-6 px-8 text-sm font-medium text-gray-500 hidden lg:table-cell">
                      Key Metrics
                    </th>
                    <th
                      className="py-6 px-8 text-center text-sm font-medium text-gray-500 cursor-pointer hover:text-black transition-colors"
                      onClick={() => toggleSort('score')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Score
                        {sortField === 'score' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th
                      className="py-6 pl-8 text-right text-sm font-medium text-gray-500 cursor-pointer hover:text-black transition-colors hidden sm:table-cell"
                      onClick={() => toggleSort('date')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Analyzed
                        {sortField === 'date' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedRepos.map((repo) => {
                    const repoFullName = `${repo.repoOwner}/${repo.repoName}`;
                    const topMetrics = repo.metrics?.slice(0, 3) || [];

                    return (
                      <tr key={`${repoFullName}-${repo.ref}-${repo.version}`} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-6 pr-8">
                          <Link href={`/${repoFullName}/scorecard`} className="flex items-start gap-3 group">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-black text-base group-hover:text-blue-600 transition-colors">
                                {repoFullName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {repo.ref !== 'main' && repo.ref !== 'master' && (
                                  <span className="text-xs font-mono text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-md">
                                    {repo.ref}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-6 px-8 hidden lg:table-cell align-top">
                          <Link href={`/${repoFullName}/scorecard`} className="block">
                            <div className="flex flex-wrap gap-2">
                              {topMetrics.map((metric, idx) => (
                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                  {metric.metric}: {metric.score}
                                </span>
                              ))}
                              {repo.metrics && repo.metrics.length > 3 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-400">
                                  +{repo.metrics.length - 3}
                                </span>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-6 px-8 text-center align-middle">
                          <Link href={`/${repoFullName}/scorecard`}>
                            {repo.overallScore !== null ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="text-lg font-bold text-black">
                                  {repo.overallScore}
                                </span>
                                <span className="text-xs text-gray-400">/100</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-sm">N/A</span>
                            )}
                          </Link>
                        </td>
                        <td className="py-6 pl-8 text-right hidden sm:table-cell align-middle">
                          <Link href={`/${repoFullName}/scorecard`}>
                            <div className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(repo.updatedAt), { addSuffix: true })}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 font-mono">
                              v{repo.version}
                            </div>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className="border-gray-200 hover:border-black hover:bg-transparent transition-colors"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500 font-mono">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages - 1}
                  className="border-gray-200 hover:border-black hover:bg-transparent transition-colors"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
