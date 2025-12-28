import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Heart, Info } from 'lucide-react';
import { getArchetypeInfo } from './constants';
import { getCrackedInfo } from '@/lib/utils/cracked';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';
import type { ReactNode } from 'react';

interface ProfileHeaderProps {
  username: string;
  profile: DeveloperProfileType;
  totalScore: number;
  arenaRanking?: { eloRating: number } | null;
  profileStyles?: {
    primaryColor?: string | null;
    textColor?: string | null;
  } | null;
  children?: ReactNode;
}

export function ProfileHeader({ username, profile, totalScore, arenaRanking, profileStyles, children }: ProfileHeaderProps) {
  const crackedInfo = getCrackedInfo(totalScore, username);
  const isSpecial = username.toLowerCase() === 'knottedbrains';

  return (
    <div className="flex gap-8">
      <div className="relative">
        <Avatar
          className={`h-24 w-24 border-2 shadow-sm ${
            crackedInfo.isCracked
              ? `${crackedInfo.colors.border} ring-4 ${crackedInfo.colors.ring}`
              : 'border-gray-200'
          }`}
          style={profileStyles?.primaryColor ? { borderColor: profileStyles.primaryColor } : undefined}
        >
          <AvatarImage src={`https://avatars.githubusercontent.com/${username}`} alt={username} />
          <AvatarFallback className="text-2xl bg-gray-50 text-gray-500">{username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {crackedInfo.isCracked && (
          <div
            className={`absolute -bottom-2 -right-2 ${crackedInfo.colors.bg} text-white p-1.5 rounded-full border-2 border-white shadow-md`}
            style={profileStyles?.primaryColor ? { backgroundColor: profileStyles.primaryColor } : undefined}
          >
            {isSpecial ? <Heart className="h-4 w-4 fill-current" /> : <Flame className="h-4 w-4 fill-current" />}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-4 flex-wrap">
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-4xl font-bold tracking-tight text-black hover:text-blue-600 transition-colors"
            style={profileStyles?.textColor ? { color: profileStyles.textColor } : undefined}
          >
            {username}
          </a>
          {crackedInfo.isCracked && (
            <Badge
              className={`${crackedInfo.colors.bg} ${crackedInfo.colors.bgHover} text-white border-none px-3 py-1 text-sm font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5`}
              style={profileStyles?.primaryColor ? { backgroundColor: profileStyles.primaryColor } : undefined}
            >
              {isSpecial ? <Heart className="h-3.5 w-3.5 fill-current" /> : <Flame className="h-3.5 w-3.5 fill-current" />}
              CRACKED
            </Badge>
          )}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
              crackedInfo.isCracked
                ? `${crackedInfo.colors.bgLight} ${crackedInfo.colors.borderLight} ${crackedInfo.colors.textLight}`
                : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
            style={profileStyles?.primaryColor ? { borderColor: profileStyles.primaryColor, color: profileStyles.primaryColor, backgroundColor: `${profileStyles.primaryColor}10` } : undefined}
          >
             <span className="text-sm font-medium">Score: {totalScore}</span>
          </div>
          {arenaRanking && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
              <Trophy className="h-3.5 w-3.5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-900">{arenaRanking.eloRating} ELO</span>
            </div>
          )}
          {profile.developerArchetype && (() => {
            const archetypeInfo = getArchetypeInfo(profile.developerArchetype);
            return (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${archetypeInfo.bgColor} ${archetypeInfo.color}`}>
                {archetypeInfo.icon}
                <span className="text-sm font-medium">{archetypeInfo.label}</span>
              </div>
            );
          })()}
          {profile.profileConfidence !== undefined && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                profile.profileConfidence >= 70
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : profile.profileConfidence >= 40
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    : 'bg-orange-50 border-orange-200 text-orange-700'
              }`}
              title={profile.confidenceReason || 'How representative this GitHub profile is of true capabilities'}
            >
              <Info className="h-3 w-3" />
              <span className="text-sm font-medium">{profile.profileConfidence}% confidence</span>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
