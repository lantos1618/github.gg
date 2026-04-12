"use client";

import { Button } from '@/components/ui/button';
import { UpgradePrompt } from '@/components/upgrade';
import { RefreshCw, FolderGit2 } from 'lucide-react';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import { usePageWidth, getWidthClass } from '@/lib/page-width-context';

function ProfileHeader({ username }: { username: string }) {
  return (
    <div className="flex gap-6 sm:gap-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://avatars.githubusercontent.com/${username}`}
        alt={username}
        className="rounded-full h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 border-2 border-[#ddd]"
      />
      <div className="min-w-0 pt-2">
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[31px] font-semibold text-[#111] hover:text-[#666] transition-colors leading-tight"
        >
          {username}
        </a>
      </div>
    </div>
  );
}

interface ProfileEmptyStateProps {
  username: string;
  isOwnProfile: boolean;
  isGenerating: boolean;
  reposLoading: boolean;
  canGenerate: boolean;
  sseStatus: SSEStatus;
  progress: number;
  currentStep: string;
  logs: SSELogItem[];
  generationError: string | null;
  onConfigure: () => void;
  onGenerate: () => void;
  onReconnect: () => void;
}

export function ProfileEmptyState({
  username,
  isOwnProfile,
  isGenerating,
  reposLoading,
  canGenerate,
  sseStatus,
  progress,
  logs,
  generationError,
  onConfigure,
  onGenerate,
  onReconnect,
}: ProfileEmptyStateProps) {
  const { width } = usePageWidth();
  const isActivelyGenerating = isGenerating && sseStatus !== 'idle';

  if (isActivelyGenerating) {
    return (
      <div data-testid="profile-empty-state" className={`w-[90%] ${getWidthClass(width, 'narrow')} mx-auto py-12`}>
        <ProfileHeader username={username} />
        <div className="mt-8">
          <ReusableSSEFeedback status={sseStatus} progress={progress} logs={logs} />
        </div>
        {/* Body skeleton — summary, skills, sidebar */}
        <div className="mt-10 grid grid-cols-1 xl:grid-cols-12 gap-12">
          <div className="xl:col-span-8 space-y-8">
            <div className="space-y-3">
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-5/6" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-4/6" />
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-md bg-gray-200 h-5 w-20" />
              ))}
            </div>
          </div>
          <div className="xl:col-span-4 space-y-8">
            <div className="animate-pulse rounded-md bg-gray-200 h-[180px] w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-[140px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="profile-empty-state" className={`w-[90%] ${getWidthClass(width, 'narrow')} mx-auto py-12`}>
      <ProfileHeader username={username} />

      <div className="py-16 text-center">
        {/* Section label */}
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">
          Developer Profile
        </div>

        <h2 className="text-[25px] font-semibold text-[#111] mb-2">
          No profile available
        </h2>

        <p className="text-base text-[#666] leading-[1.6] mb-10 max-w-md mx-auto">
          Generate an AI-powered analysis to uncover insights about <strong className="text-[#111]">{username}</strong>&apos;s GitHub activity.
        </p>

        <div className="flex justify-center items-center gap-3">
          {isOwnProfile && (
            <Button
              data-testid="profile-configure-btn"
              onClick={onConfigure}
              disabled={isGenerating || reposLoading}
              variant="outline"
              className="h-11 px-6 border-[#ddd] hover:border-[#111] text-base text-[#333] rounded-md transition-colors"
            >
              <FolderGit2 className="h-4 w-4 mr-2" />
              Configure
            </Button>
          )}
          {canGenerate ? (
            <Button
              data-testid="profile-generate-btn"
              onClick={onGenerate}
              disabled={isGenerating}
              className={`h-11 px-6 bg-[#111] hover:bg-[#333] text-white text-base font-medium rounded-md ${isGenerating ? 'animate-pulse' : ''}`}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Analysis
            </Button>
          ) : (
            <UpgradePrompt />
          )}
        </div>

        {/* Error Display */}
        {generationError && !isGenerating && (
          <div className="max-w-xl mx-auto mt-10 text-left">
            <div className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #ea4335' }}>
              <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#ea4335] mb-1">
                Error
              </div>
              <div className="text-base text-[#333] leading-[1.6] mb-2">
                {generationError}
              </div>
              {generationError.includes('already in progress') ? (
                <Button
                  onClick={onReconnect}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-[#ddd] text-base"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Reconnect
                </Button>
              ) : (
                <div className="text-[13px] text-[#888] italic mt-2">
                  This user may not have enough public activity to generate a meaningful profile.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
