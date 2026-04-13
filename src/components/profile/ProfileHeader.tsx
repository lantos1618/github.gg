import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getCrackedInfo } from '@/lib/utils/cracked';
import { Flame, Heart } from 'lucide-react';
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
      </div>

      {/* Info */}
      <div className="min-w-0">
        {/* Name + Score */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <a
            data-testid="profile-header-github-link"
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[31px] font-semibold text-[#111] hover:text-[#666] transition-colors leading-tight"
            style={profileStyles?.textColor ? { color: profileStyles.textColor } : undefined}
          >
            {username}
          </a>
          {crackedInfo.isCracked && (
            <span
              className={`text-base font-semibold uppercase tracking-[1px] ${crackedInfo.colors.text} flex items-center gap-1`}
              style={profileStyles?.primaryColor ? { color: profileStyles.primaryColor } : undefined}
            >
              {isSpecial ? <Heart className="h-4 w-4 fill-current" /> : <Flame className="h-4 w-4 fill-current" />}
              <span className="hidden sm:inline">cracked</span>
            </span>
          )}
          {crackedInfo.isCracked && <span className="text-[#ddd] text-base select-none">|</span>}
          <span
            data-testid="profile-header-score-badge"
            className={`text-base font-medium ${crackedInfo.isCracked ? crackedInfo.colors.text : 'text-[#888]'}`}
            style={profileStyles?.primaryColor ? { color: profileStyles.primaryColor } : undefined}
          >
            {totalScore}
          </span>
        </div>

        {/* Archetype + Confidence */}
        <div className="flex items-center gap-2 mt-1 text-[13px] text-[#999]">
          {profile.developerArchetype && (
            <span>{profile.developerArchetype}</span>
          )}
          {profile.developerArchetype && profile.profileConfidence !== undefined && (
            <span className="text-[#ddd]">/</span>
          )}
          {profile.profileConfidence !== undefined && (
            <span title={profile.confidenceReason || 'How representative this GitHub profile is'}>
              {profile.profileConfidence}% confidence
            </span>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
