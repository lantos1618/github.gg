'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingWave } from '@/components/LoadingWave';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Trophy, Swords } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const tierColors = {
  'Bronze': 'bg-amber-700 text-white',
  'Silver': 'bg-gray-400 text-gray-900',
  'Gold': 'bg-yellow-500 text-gray-900',
  'Platinum': 'bg-cyan-400 text-gray-900',
  'Diamond': 'bg-blue-500 text-white',
  'Master': 'bg-purple-600 text-white',
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string | undefined>(undefined);

  const { data: leaderboard, isLoading } = trpc.arena.getLeaderboard.useQuery({
    limit: 100,
    offset: 0,
    tier: selectedTier,
  });

  const filteredUsers = leaderboard?.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Trophy className="h-10 w-10 text-yellow-500" />
            Developer Leaderboard
          </h1>
          <p className="text-gray-600 text-lg">
            Discover and connect with top-rated developers
          </p>
        </div>

        <div className="mb-6 space-y-4">
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

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedTier(undefined)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                !selectedTier
                  ? "bg-gray-900 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              )}
            >
              All Tiers
            </button>
            {Object.keys(tierColors).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors",
                  selectedTier === tier
                    ? tierColors[tier as keyof typeof tierColors]
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                )}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingWave />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">No developers found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Link key={user.username} href={`/${user.username}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3">
                          {user.rank <= 3 ? (
                            <div className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl",
                              user.rank === 1 ? "bg-yellow-400 text-gray-900" :
                              user.rank === 2 ? "bg-gray-300 text-gray-900" :
                              "bg-amber-600 text-white"
                            )}>
                              {user.rank}
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
                              {user.rank}
                            </div>
                          )}
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={`https://avatars.githubusercontent.com/${user.username}`}
                              alt={user.username}
                            />
                            <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">{user.username}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className={tierColors[user.tier as keyof typeof tierColors]}>
                              {user.tier}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {user.totalBattles} battles
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                          <Swords className="h-5 w-5 text-gray-400" />
                          {user.eloRating}
                        </div>
                        <div className="text-sm text-gray-600">
                          {user.winRate}% win rate
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
