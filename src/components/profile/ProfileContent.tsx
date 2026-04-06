"use client";

import { ReactNode } from 'react';
import { UpgradePrompt } from '@/components/upgrade';
import { TopRepos } from './TopRepos';
import { TechStack } from './TechStack';
import { ProfileHeader } from './ProfileHeader';
import { ProfileActions } from './ProfileActions';
import { ProfileSidebar } from './ProfileSidebar';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';
import { usePageWidth, getWidthClass } from '@/lib/page-width-context';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';

interface ProfileContentProps {
  username: string;
  profile: DeveloperProfileType;
  totalScore: number;
  isOwnProfile: boolean;
  isGenerating: boolean;
  reposLoading: boolean;
  canRefresh: boolean;
  showUpgrade: boolean;
  sseStatus: SSEStatus;
  progress: number;
  currentStep: string;
  logs: SSELogItem[];
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
  canRefresh,
  showUpgrade,
  sseStatus,
  progress,
  currentStep,
  logs,
  scoreHistory,
  profileStyles,
  showSparkles,
  sparkleEffects,
  headerChildren,
  onConfigure,
  onRefresh,
}: ProfileContentProps) {
  const { width } = usePageWidth();
  return (
    <div
      data-testid="profile-content"
      className={`w-[90%] ${getWidthClass(width, 'narrow')} mx-auto py-12 space-y-12 relative`}
      style={{
        backgroundColor: profileStyles?.backgroundColor || undefined,
        color: profileStyles?.textColor || undefined,
      }}
    >
      {showSparkles && sparkleEffects}

      {/* Header + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 border-b border-[#eee] pb-10 relative z-10">
        <ProfileHeader
          username={username}
          profile={profile}
          totalScore={totalScore}
          profileStyles={profileStyles}
        >
          {headerChildren}
        </ProfileHeader>

        <ProfileActions
          isOwnProfile={isOwnProfile}
          isGenerating={isGenerating}
          reposLoading={reposLoading}
          canRefresh={canRefresh}
          onConfigure={onConfigure}
          onRefresh={onRefresh}
        />
      </div>

      {/* SSE Progress */}
      <ReusableSSEFeedback
        status={sseStatus}
        progress={progress}
        currentStep={currentStep}
        logs={logs}
        title="Profile Generation"
        className="w-full"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        <div className="xl:col-span-8 space-y-12">
          {/* Executive Summary */}
          <section>
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
              Summary
            </div>
            <p className="text-base text-[#666] leading-[1.7]">{profile.summary}</p>
            {profile.scoreInterpretation && (
              <div className="mt-4 bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #4285f4' }}>
                <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#4285f4] mb-1">
                  Score Context
                </div>
                <div className="text-base text-[#333] leading-[1.6]">
                  {profile.scoreInterpretation}
                </div>
              </div>
            )}
          </section>

          {/* Technical Arsenal */}
          <section>
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
              Tech Stack
            </div>
            <TechStack techStack={profile.techStack} />
          </section>

          {/* Key Repositories */}
          <section>
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
              Repositories
            </div>
            <TopRepos repos={profile.topRepos} username={username} />
          </section>
        </div>

        <ProfileSidebar
          profile={profile}
          scoreHistory={scoreHistory}
        />
      </div>

      {showUpgrade && (
        <div className="mt-10 pt-10 border-t border-[#eee]">
          <UpgradePrompt />
        </div>
      )}
    </div>
  );
}
