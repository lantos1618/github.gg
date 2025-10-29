'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, User, Sparkles, ArrowUpDown, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { DeveloperProfile } from '@/lib/types/profile';

type SortField = 'date' | 'score' | 'username' | 'elo' | 'tokens';
type SortOrder = 'asc' | 'desc';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: profiles, isLoading } = trpc.profile.getAllAnalyzedProfiles.useQuery({
    limit: 200, // Fetch more for client-side sorting
    offset: 0,
  });

  // Fetch all rankings
  const { data: leaderboard } = trpc.arena.getLeaderboard.useQuery({
    limit: 100,
    offset: 0,
  });

  // Create a map of username -> ELO rating
  const eloMap = new Map(leaderboard?.map(entry => [entry.username.toLowerCase(), entry.eloRating]) || []);

  // Filter profiles
  const filteredProfiles = profiles?.filter(profile =>
    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Sort profiles
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    const aProfile = a.profileData as DeveloperProfile;
    const bProfile = b.profileData as DeveloperProfile;

    let comparison = 0;

    if (sortField === 'date') {
      comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    } else if (sortField === 'score') {
      const aScore = aProfile.topRepos?.length
        ? aProfile.topRepos.map(r => r.significanceScore || 0).reduce((a, b) => a + b, 0) / aProfile.topRepos.length
        : 0;
      const bScore = bProfile.topRepos?.length
        ? bProfile.topRepos.map(r => r.significanceScore || 0).reduce((a, b) => a + b, 0) / bProfile.topRepos.length
        : 0;
      comparison = bScore - aScore;
    } else if (sortField === 'username') {
      comparison = a.username.localeCompare(b.username);
    } else if (sortField === 'elo') {
      const aElo = eloMap.get(a.username.toLowerCase()) || 0;
      const bElo = eloMap.get(b.username.toLowerCase()) || 0;
      comparison = bElo - aElo;
    } else if (sortField === 'tokens') {
      const aTokens = (a as any).totalTokens || 0;
      const bTokens = (b as any).totalTokens || 0;
      comparison = bTokens - aTokens;
    }

    return sortOrder === 'asc' ? -comparison : comparison;
  });

  // Paginate
  const totalPages = Math.ceil(sortedProfiles.length / pageSize);
  const paginatedProfiles = sortedProfiles.slice(page * pageSize, (page + 1) * pageSize);

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
            <User className="h-10 w-10 text-purple-600" />
            Analyzed Developer Profiles
          </h1>
          <p className="text-gray-600 text-lg">
            Discover developers with AI-generated insights and analysis
          </p>
        </div>

        {/* Search Control */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search developers by username..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-10 py-6 text-lg"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : paginatedProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'No profiles found matching your search.' : 'No analyzed profiles yet.'}
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
                        onClick={() => toggleSort('username')}
                      >
                        <div className="flex items-center gap-2">
                          Developer
                          {sortField === 'username' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Summary
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Top Skills
                      </th>
                      <th
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('elo')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                          ELO
                          {sortField === 'elo' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
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
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('tokens')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-base">🔥</span>
                          Tokens Burnt
                          {sortField === 'tokens' && <ArrowUpDown className="h-3 w-3" />}
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
                    {paginatedProfiles.map((profile) => {
                      const profileData = profile.profileData as DeveloperProfile;
                      const topSkills = profileData.techStack?.slice(0, 3) || [];
                      const avgScore = profileData.topRepos?.length
                        ? Math.round(
                            profileData.topRepos
                              .map(r => r.significanceScore || 0)
                              .reduce((a, b) => a + b, 0) / profileData.topRepos.length * 10
                          )
                        : null;

                      return (
                        <tr key={`${profile.username}-${profile.version}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/${profile.username}`} className="flex items-center gap-3 group">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={`https://avatars.githubusercontent.com/${profile.username}`}
                                  alt={profile.username}
                                />
                                <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                                  {profile.username}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    AI
                                  </Badge>
                                  {profileData.topRepos && (
                                    <span className="text-xs text-gray-500 sm:hidden">
                                      {profileData.topRepos.length} repos
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <Link href={`/${profile.username}`}>
                              <p className="text-sm text-gray-600 line-clamp-2 max-w-md">
                                {profileData.summary || 'No summary available'}
                              </p>
                            </Link>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <Link href={`/${profile.username}`}>
                              <div className="flex flex-wrap gap-1">
                                {topSkills.map((skill, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {skill.name}
                                  </Badge>
                                ))}
                                {profileData.techStack && profileData.techStack.length > 3 && (
                                  <Badge variant="outline" className="text-xs text-gray-500">
                                    +{profileData.techStack.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center hidden xl:table-cell">
                            <Link href={`/${profile.username}`}>
                              {eloMap.get(profile.username.toLowerCase()) ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  <span className="text-lg font-bold text-gray-900">
                                    {eloMap.get(profile.username.toLowerCase())}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Link href={`/${profile.username}`}>
                              {avgScore !== null ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-2xl font-bold text-purple-600">
                                    {avgScore}
                                  </span>
                                  <span className="text-xs text-gray-500">/100</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center hidden lg:table-cell">
                            <Link href={`/${profile.username}`}>
                              {(profile as any).totalTokens ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-lg font-semibold text-purple-700">
                                    {((profile as any).totalTokens).toLocaleString()}
                                  </span>
                                  <span className="text-xs text-gray-500">tokens</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center hidden sm:table-cell">
                            <Link href={`/${profile.username}`}>
                              <div className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(profile.updatedAt), { addSuffix: true })}
                              </div>
                              {profileData.topRepos && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {profileData.topRepos.length} repos
                                </div>
                              )}
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
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, sortedProfiles.length)} of {sortedProfiles.length} profiles
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
