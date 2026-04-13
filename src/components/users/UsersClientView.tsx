'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, Flame, Heart } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { ScoredMetric, DeveloperArchetype } from '@/lib/types/profile';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import { getCrackedInfo } from '@/lib/utils/cracked';

type SortField = 'date' | 'score' | 'username' | 'tokens';
type SortOrder = 'asc' | 'desc';

/** Lightweight profile shape — only the fields needed for the table listing */
interface LightProfileData {
  summary?: string;
  skillAssessment?: ScoredMetric[];
  developerArchetype?: DeveloperArchetype;
  profileConfidence?: number;
}

interface DeveloperProfileEntry {
  username: string;
  profileData: LightProfileData | unknown;
  updatedAt: Date | string;
  totalTokens?: number;
  version?: number;
}

interface UsersClientViewProps {
  initialProfiles: DeveloperProfileEntry[];
  totalProfileCount: number;
}

export function UsersClientView({ initialProfiles, totalProfileCount }: UsersClientViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const filteredProfiles = initialProfiles?.filter(profile =>
    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getProfileScore = (profile: LightProfileData) => {
    if (!profile.skillAssessment?.length) return 0;
    return Math.round((profile.skillAssessment.reduce((acc, skill) => acc + skill.score, 0) / profile.skillAssessment.length) * 10);
  };

  const comparators: Record<SortField, (a: DeveloperProfileEntry, b: DeveloperProfileEntry) => number> = {
    date: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    score: (a, b) => getProfileScore(b.profileData as LightProfileData) - getProfileScore(a.profileData as LightProfileData),
    username: (a, b) => a.username.localeCompare(b.username),
    tokens: (a, b) => (b.totalTokens || 0) - (a.totalTokens || 0),
  };

  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    const comparison = comparators[sortField](a, b);
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  const totalPages = Math.ceil(sortedProfiles.length / pageSize);
  const paginatedProfiles = sortedProfiles.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">
              Profiles
              <span className="text-base font-normal text-[#888] ml-3">{totalProfileCount.toLocaleString()}</span>
            </h1>
          </div>
          <div className="group relative w-64 flex-shrink-0">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ccc] group-focus-within:text-[#111] transition-colors" />
            <Input
              type="text"
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-6"
            />
          </div>
        </div>

        {paginatedProfiles.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base text-[#aaa]">{searchQuery ? 'No profiles found.' : 'No analyzed profiles yet.'}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-base border-collapse table-fixed">
              <thead>
                <tr className="border-b border-[#ddd]">
                  <td className="w-[40%] py-2 text-xs text-[#999] font-semibold cursor-pointer hover:text-[#111] transition-colors" onClick={() => toggleSort('username')}>
                    <span className="inline-flex items-center gap-1">Developer <ArrowUpDown className={`h-3 w-3 ${sortField !== 'username' ? 'invisible' : ''}`} /></span>
                  </td>
                  <td className="w-[35%] py-2 text-xs text-[#999] font-semibold hidden lg:table-cell">Summary</td>
                  <td className="w-[12%] py-2 text-xs text-[#999] font-semibold text-center cursor-pointer hover:text-[#111] transition-colors" onClick={() => toggleSort('score')}>
                    <span className="inline-flex items-center gap-1">Score <ArrowUpDown className={`h-3 w-3 ${sortField !== 'score' ? 'invisible' : ''}`} /></span>
                  </td>
                  <td className="w-[13%] py-2 text-xs text-[#999] font-semibold text-right cursor-pointer hover:text-[#111] transition-colors hidden sm:table-cell" onClick={() => toggleSort('date')}>
                    <span className="inline-flex items-center gap-1">Analyzed <ArrowUpDown className={`h-3 w-3 ${sortField !== 'date' ? 'invisible' : ''}`} /></span>
                  </td>
                </tr>
              </thead>
              <tbody>
                {paginatedProfiles.map((profile) => {
                  const profileData = profile.profileData as LightProfileData;
                  const avgScore = profileData.skillAssessment?.length
                    ? Math.round((profileData.skillAssessment.reduce((acc, skill) => acc + skill.score, 0) / profileData.skillAssessment.length) * 10)
                    : null;
                  const crackedInfo = getCrackedInfo(avgScore ?? 0, profile.username);
                  const isSpecial = profile.username.toLowerCase() === 'knottedbrains';

                  return (
                    <tr key={`${profile.username}-${profile.version}`} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                      <td className="py-3">
                        <Link href={`/${profile.username}`} className="flex items-center gap-3 group min-w-0">
                          <Avatar className="h-8 w-8 flex-shrink-0 border border-[#eee]">
                            <AvatarImage src={`https://avatars.githubusercontent.com/${profile.username}`} alt={profile.username} />
                            <AvatarFallback className="bg-[#f8f9fa] text-[#aaa] text-[13px]">{profile.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#111] group-hover:text-[#666] transition-colors truncate">{profile.username}</span>
                              {crackedInfo.isCracked && (
                                <Badge className={`${crackedInfo.colors.bg} text-white border-none px-1.5 py-0 text-[10px] font-semibold uppercase tracking-[0.5px] flex items-center gap-0.5`}>
                                  {isSpecial ? <Heart className="h-2.5 w-2.5 fill-current" /> : <Flame className="h-2.5 w-2.5 fill-current" />}
                                  <span className="hidden sm:inline">cracked</span>
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 hidden lg:table-cell">
                        <Link href={`/${profile.username}`}>
                          <p className="text-base text-[#888] truncate">{profileData.summary || 'No summary'}</p>
                        </Link>
                      </td>
                      <td className="py-3 text-center">
                        <Link href={`/${profile.username}`}>
                          {avgScore !== null ? (
                            <span className="font-semibold text-[#111]">{avgScore}<span className="text-[13px] text-[#aaa] ml-0.5">/100</span></span>
                          ) : <span className="text-[#ccc]">N/A</span>}
                        </Link>
                      </td>
                      <td className="py-3 text-right hidden sm:table-cell" suppressHydrationWarning>
                        <Link href={`/${profile.username}`} className="text-base text-[#888]">
                          {formatDistanceToNow(new Date(profile.updatedAt), { addSuffix: true })}
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
      </PageWidthContainer>
    </div>
  );
}
