"use client";

import { Button } from '@/components/ui/button';
import { UpgradePrompt } from '@/components/upgrade';
import { RefreshCw, FolderGit2, AlertCircle } from 'lucide-react';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';

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
  currentStep,
  logs,
  generationError,
  onConfigure,
  onGenerate,
  onReconnect,
}: ProfileEmptyStateProps) {
  return (
    <div data-testid="profile-empty-state" className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-3xl font-bold text-black mb-4">No Profile Available</h2>
      <p className="text-xl text-gray-500 font-light mb-10 max-w-lg">
        Generate an AI-powered analysis to uncover insights about {username}.
      </p>
      <div className="flex justify-center items-center gap-4">
        {isOwnProfile && (
          <Button
            data-testid="profile-configure-btn"
            onClick={onConfigure}
            disabled={isGenerating || reposLoading}
            variant="outline"
            className="h-14 px-8 border-gray-200 hover:border-black transition-colors text-lg rounded-xl"
          >
            <FolderGit2 className="h-5 w-5 mr-2" />
            Configure
          </Button>
        )}
        {canGenerate ? (
          <Button
            data-testid="profile-generate-btn"
            onClick={onGenerate}
            disabled={isGenerating}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analyzing...' : 'Generate Analysis'}
          </Button>
        ) : (
          <UpgradePrompt />
        )}
      </div>

      {/* Progress Bar for Empty State */}
      <div className="w-full max-w-xl mt-8">
        <ReusableSSEFeedback
          status={sseStatus}
          progress={progress}
          currentStep={currentStep}
          logs={logs}
          title="Profile Generation"
        />
      </div>

      {/* Error Display */}
      {generationError && !isGenerating && (
        <div className="w-full max-w-xl mt-8 bg-red-50 border border-red-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Generate Profile</h3>
              <p className="text-red-700 text-sm leading-relaxed">{generationError}</p>
              {generationError.includes('already in progress') ? (
                <div className="mt-4">
                  <Button
                    onClick={onReconnect}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconnect
                  </Button>
                </div>
              ) : (
                <p className="text-red-600 text-xs mt-3">
                  This user may not have enough public activity on GitHub to generate a meaningful profile analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
