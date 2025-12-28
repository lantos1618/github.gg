'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, ArrowUpDown, ChevronLeft, ChevronRight, Trophy, Flame, Heart } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { DeveloperProfile } from '@/lib/types/profile';
import { LoadingPage } from '@/components/common';
import { getCrackedInfo } from '@/lib/utils/cracked';

type SortField = 'date' | 'score' | 'username' | 'elo' | 'tokens';
type SortOrder = 'asc' | 'desc';

interface DeveloperProfileEntry {
  username: string;
  profileData: DeveloperProfile | unknown; // Can be unknown on server
  updatedAt: Date | string;
  totalTokens?: number;
  version?: number;
}

interface LeaderboardEntry {
  username: string;
  eloRating: number;
}

interface UsersClientViewProps {
  initialProfiles: DeveloperProfileEntry[];
  initialLeaderboard: LeaderboardEntry[];
}

export function UsersClientView({ initialProfiles, initialLeaderboard }: UsersClientViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Create a map of username -> ELO rating
  const eloMap = new Map(initialLeaderboard?.map(entry => [entry.username.toLowerCase(), entry.eloRating]) || []);

  // Filter profiles
  const filteredProfiles = initialProfiles?.filter(profile =>
    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getProfileScore = (profile: DeveloperProfile) => {
    if (!profile.skillAssessment?.length) return 0;
    return Math.round(
      (profile.skillAssessment.reduce((acc, skill) => acc + skill.score, 0) / profile.skillAssessment.length) * 10
    );
  };

  const comparators: Record<SortField, (a: DeveloperProfileEntry, b: DeveloperProfileEntry) => number> = {
    date: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    score: (a, b) => getProfileScore(b.profileData as DeveloperProfile) - getProfileScore(a.profileData as DeveloperProfile),
    username: (a, b) => a.username.localeCompare(b.username),
    elo: (a, b) => (eloMap.get(b.username.toLowerCase()) || 0) - (eloMap.get(a.username.toLowerCase()) || 0),
    tokens: (a, b) => (b.totalTokens || 0) - (a.totalTokens || 0),
  };

  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    const comparison = comparators[sortField](a, b);
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
    <div className="min-h-screen bg-white pt-20 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
            <h1 className="text-5xl font-bold text-black tracking-tight mb-4">Analyzed Profiles</h1>
            <p className="text-xl text-gray-500 font-light max-w-2xl">
                Discover developers with AI-generated insights.
            </p>
        </div>

        {/* Search Control */}
        <div className="mb-12">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-12 h-14 text-lg border-2 border-gray-100 rounded-xl focus:border-black focus:ring-0 transition-colors"
            />
          </div>
        </div>

        {paginatedProfiles.length === 0 ? (
          <div className="py-20 text-center border-t border-gray-100">
            <p className="text-gray-400 text-lg">
              {searchQuery ? 'No profiles found.' : 'No analyzed profiles yet.'}
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
                      onClick={() => toggleSort('username')}
                    >
                      <div className="flex items-center gap-2">
                        Developer
                        {sortField === 'username' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="py-6 px-8 text-sm font-medium text-gray-500 hidden lg:table-cell">
                      Summary
                    </th>
                    <th className="py-6 px-8 text-sm font-medium text-gray-500 hidden md:table-cell">
                      Top Skills
                    </th>
                    <th
                      className="py-6 px-8 text-center text-sm font-medium text-gray-500 cursor-pointer hover:text-black transition-colors hidden xl:table-cell"
                      onClick={() => toggleSort('elo')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        ELO
                        {sortField === 'elo' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
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
                  {paginatedProfiles.map((profile) => {
                    const profileData = profile.profileData as DeveloperProfile;
                    const topSkills = profileData.techStack?.slice(0, 3) || [];
                    const avgScore = profileData.skillAssessment?.length
                      ? Math.round(
                          (profileData.skillAssessment.reduce((acc, skill) => acc + skill.score, 0) / profileData.skillAssessment.length) * 10
                        )
                      : null;
                    const crackedInfo = getCrackedInfo(avgScore ?? 0, profile.username);
                    const isSpecial = profile.username.toLowerCase() === 'knottedbrains';

                    return (
                      <tr key={`${profile.username}-${profile.version}`} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-6 pr-8">
                          <Link href={`/${profile.username}`} className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border border-gray-200">
                              <AvatarImage
                                src={`https://avatars.githubusercontent.com/${profile.username}`}
                                alt={profile.username}
                              />
                              <AvatarFallback className="bg-gray-100 text-gray-500">{profile.username[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-black text-base group-hover:text-blue-600 transition-colors">
                                  {profile.username}
                                </p>
                                {crackedInfo.isCracked && (
                                  <Badge className={`${crackedInfo.colors.bg} ${crackedInfo.colors.bgHover} text-white border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1`}>
                                    {isSpecial ? <Heart className="h-3 w-3 fill-current" /> : <Flame className="h-3 w-3 fill-current" />}
                                    Cracked
                                  </Badge>
                                )}
                              </div>
                              {profileData.topRepos && (
                                <p className="text-xs text-gray-400 mt-0.5 sm:hidden">
                                  {profileData.topRepos.length} repos
                                </p>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-6 px-8 hidden lg:table-cell align-top">
                          <Link href={`/${profile.username}`} className="block">
                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 max-w-xl">
                              {profileData.summary || 'No summary available'}
                            </p>
                          </Link>
                        </td>
                        <td className="py-6 px-8 hidden md:table-cell align-top">
                          <Link href={`/${profile.username}`} className="block">
                            <div className="flex flex-wrap gap-2">
                              {topSkills.map((skill, idx) => (
                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                  {skill.name}
                                </span>
                              ))}
                              {profileData.techStack && profileData.techStack.length > 3 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-400">
                                  +{profileData.techStack.length - 3}
                                </span>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-6 px-8 text-center hidden xl:table-cell align-middle">
                          <Link href={`/${profile.username}`}>
                            {eloMap.get(profile.username.toLowerCase()) ? (
                              <span className="font-mono font-bold text-black">
                                {eloMap.get(profile.username.toLowerCase())}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </Link>
                        </td>
                        <td className="py-6 px-8 text-center align-middle">
                          <Link href={`/${profile.username}`}>
                            {avgScore !== null ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="text-lg font-bold text-black">
                                  {avgScore}
                                </span>
                                <span className="text-xs text-gray-400">/100</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-sm">N/A</span>
                            )}
                          </Link>
                        </td>
                        <td className="py-6 pl-8 text-right hidden sm:table-cell align-middle">
                          <Link href={`/${profile.username}`}>
                            <div className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(profile.updatedAt), { addSuffix: true })}
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
