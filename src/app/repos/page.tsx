'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingWave } from '@/components/LoadingWave';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Clock, ArrowUpDown, ChevronLeft, ChevronRight, GitFork } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

type SortField = 'date' | 'score' | 'name';
type SortOrder = 'asc' | 'desc';

export default function ReposPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: repos, isLoading } = trpc.scorecard.getAllAnalyzedRepos.useQuery({
    limit: 200, // Fetch more for client-side sorting
    offset: 0,
  });

  // Filter repos
  const filteredRepos = repos?.filter(repo =>
    `${repo.repoOwner}/${repo.repoName}`.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Sort repos
  const sortedRepos = [...filteredRepos].sort((a, b) => {
    let comparison = 0;

    if (sortField === 'date') {
      comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    } else if (sortField === 'score') {
      comparison = (b.overallScore || 0) - (a.overallScore || 0);
    } else if (sortField === 'name') {
      comparison = `${a.repoOwner}/${a.repoName}`.localeCompare(`${b.repoOwner}/${b.repoName}`);
    }

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <GitFork className="h-10 w-10 text-purple-600" />
            Analyzed Repositories
          </h1>
          <p className="text-gray-600 text-lg">
            Explore repositories with AI-generated scorecards and insights
          </p>
        </div>

        {/* Search and Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-10 py-6 text-lg"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={sortField === 'date' ? 'default' : 'outline'}
              onClick={() => toggleSort('date')}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Date
              {sortField === 'date' && <ArrowUpDown className="h-3 w-3" />}
            </Button>
            <Button
              variant={sortField === 'score' ? 'default' : 'outline'}
              onClick={() => toggleSort('score')}
              className="flex items-center gap-2"
            >
              Score
              {sortField === 'score' && <ArrowUpDown className="h-3 w-3" />}
            </Button>
            <Button
              variant={sortField === 'name' ? 'default' : 'outline'}
              onClick={() => toggleSort('name')}
              className="flex items-center gap-2"
            >
              Name
              {sortField === 'name' && <ArrowUpDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingWave />
          </div>
        ) : paginatedRepos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'No repositories found matching your search.' : 'No analyzed repositories yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Table View */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Repository
                          {sortField === 'name' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Metrics
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('score')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Score
                          {sortField === 'score' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Analyzed
                          {sortField === 'date' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedRepos.map((repo) => {
                      const repoFullName = `${repo.repoOwner}/${repo.repoName}`;
                      const topMetrics = repo.metrics?.slice(0, 3) || [];

                      return (
                        <tr key={`${repoFullName}-${repo.ref}-${repo.version}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <Link href={`/${repoFullName}/scorecard`} className="flex items-start gap-3 group">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                                  {repoFullName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    AI
                                  </Badge>
                                  {repo.ref !== 'main' && (
                                    <Badge variant="outline" className="text-xs">
                                      {repo.ref}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <Link href={`/${repoFullName}/scorecard`}>
                              <div className="flex flex-wrap gap-1">
                                {topMetrics.map((metric, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {metric.metric}: {metric.score}
                                  </Badge>
                                ))}
                                {repo.metrics && repo.metrics.length > 3 && (
                                  <Badge variant="outline" className="text-xs text-gray-500">
                                    +{repo.metrics.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Link href={`/${repoFullName}/scorecard`}>
                              {repo.overallScore !== null ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-2xl font-bold text-purple-600">
                                    {repo.overallScore}
                                  </span>
                                  <span className="text-xs text-gray-500">/100</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center hidden sm:table-cell">
                            <Link href={`/${repoFullName}/scorecard`}>
                              <div className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(repo.updatedAt), { addSuffix: true })}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, sortedRepos.length)} of {sortedRepos.length} repositories
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (page < 3) {
                        pageNum = i;
                      } else if (page > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
