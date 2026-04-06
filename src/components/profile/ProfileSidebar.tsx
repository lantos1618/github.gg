'use client';

import dynamic from 'next/dynamic';
import { DevelopmentStyle } from './DevelopmentStyle';
import { SkillAssessment } from './SkillAssessment';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';

const ScoreHistory = dynamic(
  () => import('@/components/ScoreHistory').then(mod => ({ default: mod.ScoreHistory })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse rounded-md bg-gray-200 h-[300px] w-full" />,
  }
);

interface ScoreDataPoint {
  date: string;
  score: number;
  source: string;
}

interface ProfileSidebarProps {
  profile: DeveloperProfileType;
  scoreHistory?: ScoreDataPoint[] | null;
  scoreHistoryLoading?: boolean;
}

export function ProfileSidebar({ profile, scoreHistory, scoreHistoryLoading }: ProfileSidebarProps) {
  return (
    <div data-testid="profile-sidebar" className="xl:col-span-4 space-y-10 min-h-[500px]">

      {/* Fixed-height container for score history to prevent CLS when data loads */}
      <div className="min-h-[80px]">
        {scoreHistoryLoading ? (
          <section>
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
              Score History
            </div>
            <div className="animate-pulse rounded-md bg-gray-200 h-[300px] w-full" />
          </section>
        ) : scoreHistory && scoreHistory.length > 0 ? (
          <section>
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
              Score History
            </div>
            <div className="p-4 bg-[#f8f9fa] border border-[#eee] rounded">
              <ScoreHistory
                data={scoreHistory}
                title=""
                scoreLabel="ELO"
                color="#111"
              />
            </div>
          </section>
        ) : null}
      </div>

      <section>
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
          Persona
        </div>
        <DevelopmentStyle traits={profile.developmentStyle} />
      </section>

      <section>
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
          Skills
        </div>
        <SkillAssessment skills={profile.skillAssessment} />
      </section>

      {Array.isArray(profile.suggestions) && profile.suggestions.length > 0 && (
        <section>
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Growth
          </div>
          <div className="space-y-2">
            {profile.suggestions.map((suggestion, idx) => (
              <div key={idx} className="text-base text-[#666] leading-[1.6] flex gap-2">
                <span className="text-[#111] font-semibold flex-shrink-0">{idx + 1}.</span>
                {suggestion}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
