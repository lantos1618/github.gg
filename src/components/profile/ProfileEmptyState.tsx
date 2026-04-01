"use client";

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradePrompt } from '@/components/upgrade';
import { RefreshCw, FolderGit2 } from 'lucide-react';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';

function ProfileGeneratingSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header skeleton */}
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Score skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="py-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Summary skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Skills skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded" />
          ))}
        </div>
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
  const isActivelyGenerating = isGenerating && sseStatus !== 'idle';

  if (isActivelyGenerating) {
    return (
      <div data-testid="profile-empty-state" className="py-8">
        <div className="w-full max-w-5xl mx-auto">
          <ReusableSSEFeedback status={sseStatus} progress={progress} logs={logs} className="mb-8" />
        </div>
        <ProfileGeneratingSkeleton />
      </div>
    );
  }

  return (
    <div data-testid="profile-empty-state" className="w-[90%] max-w-5xl mx-auto py-20 text-center">
      {/* Section label */}
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">
        Developer Profile
      </div>

      <h2 className="text-[25px] font-semibold text-[#111] mb-2">
        No profile available
      </h2>

      <p className="text-base text-[#666] leading-[1.6] mb-10 max-w-md mx-auto">
        Generate an AI-powered analysis to uncover insights about <strong className="text-[#111]">{username}</strong>'s GitHub activity.
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
  );
}
