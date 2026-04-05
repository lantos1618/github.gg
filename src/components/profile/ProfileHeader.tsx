import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Flame, Heart, Info } from 'lucide-react';
import { getArchetypeInfo } from './constants';
import { getCrackedInfo } from '@/lib/utils/cracked';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';
import type { ReactNode } from 'react';

interface ProfileHeaderProps {
  username: string;
  profile: DeveloperProfileType;
  totalScore: number;
  profileStyles?: {
    primaryColor?: string | null;
    textColor?: string | null;
  } | null;
  children?: ReactNode;
}

export function ProfileHeader({ username, profile, totalScore, profileStyles, children }: ProfileHeaderProps) {
  const crackedInfo = getCrackedInfo(totalScore, username);
  const isSpecial = username.toLowerCase() === 'knottedbrains';

  return (
    <div data-testid="profile-header" className="flex gap-6 sm:gap-8">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar
          data-testid="profile-header-avatar"
          className={`h-20 w-20 sm:h-24 sm:w-24 border-2 ${
            crackedInfo.isCracked
              ? `${crackedInfo.colors.border} ring-4 ${crackedInfo.colors.ring}`
              : 'border-[#ddd]'
          }`}
          style={profileStyles?.primaryColor ? { borderColor: profileStyles.primaryColor } : undefined}
        >
          <AvatarImage src={`https://avatars.githubusercontent.com/${username}`} alt={username} />
          <AvatarFallback className="text-2xl bg-[#f8f9fa] text-[#aaa]">{username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {crackedInfo.isCracked && (
          <div
            className={`absolute -bottom-2 -right-2 ${crackedInfo.colors.bg} text-white p-1.5 rounded-full border-2 border-white`}
            style={profileStyles?.primaryColor ? { backgroundColor: profileStyles.primaryColor } : undefined}
          >
            {isSpecial ? <Heart className="h-4 w-4 fill-current" /> : <Flame className="h-4 w-4 fill-current" />}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        {/* Section label */}
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-1">
          Developer Profile
        </div>

        {/* Name */}
        <a
          data-testid="profile-header-github-link"
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[31px] sm:text-[31px] font-semibold text-[#111] hover:text-[#666] transition-colors leading-tight block"
          style={profileStyles?.textColor ? { color: profileStyles.textColor } : undefined}
        >
          {username}
        </a>

        {/* Metadata row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {crackedInfo.isCracked && (
            <Badge
              className={`${crackedInfo.colors.bg} ${crackedInfo.colors.bgHover} text-white border-none px-2.5 py-0.5 text-[13px] font-semibold uppercase tracking-[1px] flex items-center gap-1`}
              style={profileStyles?.primaryColor ? { backgroundColor: profileStyles.primaryColor } : undefined}
            >
              {isSpecial ? <Heart className="h-3 w-3 fill-current" /> : <Flame className="h-3 w-3 fill-current" />}
              CRACKED
            </Badge>
          )}

          <div
            data-testid="profile-header-score-badge"
            className="text-base font-medium text-[#111] px-2.5 py-0.5 bg-[#f8f9fa] border border-[#eee] rounded"
            style={profileStyles?.primaryColor ? { borderColor: profileStyles.primaryColor, color: profileStyles.primaryColor } : undefined}
          >
            Score: {totalScore}
          </div>

          {profile.developerArchetype && (() => {
            const archetypeInfo = getArchetypeInfo(profile.developerArchetype);
            return (
              <div className={`flex items-center gap-1 text-base font-medium px-2.5 py-0.5 rounded border ${archetypeInfo.bgColor} ${archetypeInfo.color}`}>
                {archetypeInfo.icon}
                {archetypeInfo.label}
              </div>
            );
          })()}

          {profile.profileConfidence !== undefined && (
            <div
              className="flex items-center gap-1 text-[13px] text-[#aaa] px-2 py-0.5"
              title={profile.confidenceReason || 'How representative this GitHub profile is of true capabilities'}
            >
              <Info className="h-3 w-3" />
              {profile.profileConfidence}% confidence
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
