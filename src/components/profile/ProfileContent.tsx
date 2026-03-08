"use client";

import { ReactNode } from 'react';
import { UpgradePrompt } from '@/components/upgrade';
import { TopRepos } from './TopRepos';
import { TechStack } from './TechStack';
import { ProfileHeader } from './ProfileHeader';
import { ProfileActions } from './ProfileActions';
import { ProfileSidebar } from './ProfileSidebar';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';

interface ProfileContentProps {
  username: string;
  profile: DeveloperProfileType;
  totalScore: number;
  isOwnProfile: boolean;
  isGenerating: boolean;
  reposLoading: boolean;
  showChallengeButton: boolean;
  canRefresh: boolean;
  showUpgrade: boolean;
  sseStatus: SSEStatus;
  progress: number;
  currentStep: string;
  logs: SSELogItem[];
  arenaRanking?: { eloRating: number } | null;
  scoreHistory?: { date: string; score: number; source: string }[] | null;
  profileStyles?: {
    sparkles?: boolean | null;
    emoji?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    primaryColor?: string | null;
  } | null;
  showSparkles: boolean;
  sparkleEffects: ReactNode;
  headerChildren: ReactNode;
  onChallenge: () => void;
  onConfigure: () => void;
  onRefresh: () => void;
}

export function ProfileContent({
  username,
  profile,
  totalScore,
  isOwnProfile,
  isGenerating,
  reposLoading,
  showChallengeButton,
  canRefresh,
  showUpgrade,
  sseStatus,
  progress,
  currentStep,
  logs,
  arenaRanking,
  scoreHistory,
  profileStyles,
  showSparkles,
  sparkleEffects,
  headerChildren,
  onChallenge,
  onConfigure,
  onRefresh,
}: ProfileContentProps) {
  return (
    <div
      data-testid="profile-content"
      className="max-w-[1200px] mx-auto px-4 py-16 space-y-16 relative"
      style={{
        backgroundColor: profileStyles?.backgroundColor || undefined,
        color: profileStyles?.textColor || undefined,
      }}
    >
      {showSparkles && sparkleEffects}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 border-b border-gray-100 pb-12 relative z-10">
        <ProfileHeader
          username={username}
          profile={profile}
          totalScore={totalScore}
          arenaRanking={arenaRanking}
          profileStyles={profileStyles}
        >
          {headerChildren}
        </ProfileHeader>

        <ProfileActions
          isOwnProfile={isOwnProfile}
          isGenerating={isGenerating}
          reposLoading={reposLoading}
          showChallengeButton={showChallengeButton}
          canRefresh={canRefresh}
          onChallenge={onChallenge}
          onConfigure={onConfigure}
          onRefresh={onRefresh}
        />
      </div>

      {/* Progress Bar - Terminal-style logger for real-time generation feedback */}
      <ReusableSSEFeedback
        status={sseStatus}
        progress={progress}
        currentStep={currentStep}
        logs={logs}
        title="Profile Generation"
        className="w-full"
      />

      {/* Profile Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        <div className="xl:col-span-8 space-y-16">
          <section>
            <h3 className="text-2xl font-bold text-black mb-6">Executive Summary</h3>
            <p className="text-lg text-gray-600 leading-relaxed font-light">{profile.summary}</p>
            {profile.scoreInterpretation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-800 leading-relaxed">
                  <span className="font-medium">Score Context:</span> {profile.scoreInterpretation}
                </p>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-2xl font-bold text-black mb-6">Technical Arsenal</h3>
            <TechStack techStack={profile.techStack} />
          </section>

          <section>
            <h3 className="text-2xl font-bold text-black mb-6">Key Repositories</h3>
            <TopRepos repos={profile.topRepos} />
          </section>
        </div>

        <ProfileSidebar profile={profile} scoreHistory={scoreHistory} />
      </div>

      {showUpgrade && (
        <div className="mt-12 pt-12 border-t border-gray-100">
          <UpgradePrompt />
        </div>
      )}
    </div>
  );
}
