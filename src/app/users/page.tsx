'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingWave } from '@/components/LoadingWave';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, User, Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { DeveloperProfile } from '@/lib/types/profile';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: profiles, isLoading } = trpc.profile.getAllAnalyzedProfiles.useQuery({
    limit: 100,
    offset: 0,
  });

  const filteredProfiles = profiles?.filter(profile =>
    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <User className="h-10 w-10 text-purple-600" />
            Analyzed Developer Profiles
          </h1>
          <p className="text-gray-600 text-lg">
            Discover developers with AI-generated insights and analysis
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search developers by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-lg"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingWave />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'No profiles found matching your search.' : 'No analyzed profiles yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => {
              const profileData = profile.profileData as DeveloperProfile;
              const topSkills = profileData.techStack?.slice(0, 5) || [];
              const avgScore = profileData.topRepos?.length
                ? Math.round(
                    profileData.topRepos
                      .map(r => r.significanceScore || 0)
                      .reduce((a, b) => a + b, 0) / profileData.topRepos.length * 10
                  )
                : null;

              return (
                <Link key={`${profile.username}-${profile.version}`} href={`/${profile.username}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <Avatar className="h-16 w-16">
                            <AvatarImage
                              src={`https://avatars.githubusercontent.com/${profile.username}`}
                              alt={profile.username}
                            />
                            <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900 truncate">
                                {profile.username}
                              </h3>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI Analyzed
                              </Badge>
                            </div>

                            {profileData.summary && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {profileData.summary}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {topSkills.map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {skill.name}
                                </Badge>
                              ))}
                              {topSkills.length > 0 && profileData.techStack && profileData.techStack.length > 5 && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  +{profileData.techStack.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-2 flex-shrink-0">
                          {avgScore !== null && (
                            <div className="text-2xl font-bold text-purple-600">
                              {avgScore}/10
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(profile.updatedAt), { addSuffix: true })}
                          </div>
                          {profileData.topRepos && (
                            <div className="text-xs text-gray-500">
                              {profileData.topRepos.length} repos analyzed
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
