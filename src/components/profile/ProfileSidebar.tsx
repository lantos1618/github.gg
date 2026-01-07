'use client';

import dynamic from 'next/dynamic';
import { DevelopmentStyle } from './DevelopmentStyle';
import { SkillAssessment } from './SkillAssessment';
import { Skeleton } from '@/components/ui/skeleton';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';

// Lazy load ScoreHistory - Recharts is ~100KB+, only load when score history exists
const ScoreHistory = dynamic(
  () => import('@/components/ScoreHistory').then(mod => ({ default: mod.ScoreHistory })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    ),
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
}

export function ProfileSidebar({ profile, scoreHistory }: ProfileSidebarProps) {
  return (
    <div className="xl:col-span-4 space-y-12">
      {scoreHistory && scoreHistory.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-black mb-4">ELO Trajectory</h3>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <ScoreHistory
              data={scoreHistory}
              title=""
              scoreLabel="ELO"
              color="#000000"
            />
          </div>
        </section>
      )}

      <section>
        <h3 className="text-lg font-bold text-black mb-4">Developer Persona</h3>
        <DevelopmentStyle traits={profile.developmentStyle} />
      </section>

      <section>
        <h3 className="text-lg font-bold text-black mb-4">Skill Assessment</h3>
        <SkillAssessment skills={profile.skillAssessment} />
      </section>

      {Array.isArray(profile.suggestions) && profile.suggestions.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-black mb-4">Growth Areas</h3>
          <ul className="space-y-3">
            {profile.suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-gray-600 text-sm leading-relaxed flex gap-2">
                <span className="text-black font-bold">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
