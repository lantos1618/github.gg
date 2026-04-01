'use client';

import React, { ReactNode } from 'react';
import { AnalysisErrorDisplay } from '@/components/ui/analysis-error-display';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth/client';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';

function AnalysisLoadingSkeleton() {
  return (
    <div className="w-[90%] max-w-[1100px] mx-auto pt-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="py-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-24 w-full mt-4" />
      </div>
    </div>
  );
}

type AnalysisState = 'loading' | 'error' | 'no-data' | 'ready' | 'private' | 'upgrade' | 'auth-error';

interface AnalysisStateHandlerProps {
  state: AnalysisState;
  error?: string;
  isRegenerating?: boolean;
  onRegenerate?: () => void;
  message?: string;
  title?: string;
  description?: string;
  filesSelected?: { selected: number; total: number };
  children?: ReactNode;
  sseStatus?: SSEStatus;
  sseProgress?: number;
  sseCurrentStep?: string;
  sseLogs?: SSELogItem[];
  sseTitle?: string;
}

export const AnalysisStateHandler: React.FC<AnalysisStateHandlerProps> = ({
  state,
  error,
  isRegenerating = false,
  onRegenerate,
  message,
  title,
  description,
  filesSelected,
  children,
  sseStatus,
  sseProgress,
  sseLogs,
}) => {
  const { signIn } = useAuth();

  const handleReSignIn = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';
    signIn(currentUrl);
  };

  switch (state) {
    case 'loading':
      return <AnalysisLoadingSkeleton />;

    case 'error':
      return (
        <AnalysisErrorDisplay
          error={error || 'An error occurred'}
          isPending={isRegenerating}
          onRetry={onRegenerate}
        />
      );

    case 'no-data': {
      const showSSEFeedback = isRegenerating && sseStatus && sseStatus !== 'idle';

      return (
        <div data-testid="analysis-state-handler" className="flex flex-col items-center justify-center min-h-[400px] px-4">
          {!showSSEFeedback && (
            <>
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
                Analysis
              </div>
              <h2 className="text-[20px] font-semibold text-[#111] mb-2">
                {title || 'No analysis available'}
              </h2>
              <p className="text-base text-[#aaa] mb-8 text-center max-w-md">
                {description || 'Generate an analysis to get started'}
              </p>
              <Button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className={`h-11 px-6 bg-[#111] hover:bg-[#333] text-white text-base font-medium rounded-md ${isRegenerating ? 'animate-pulse' : ''}`}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Analysis
              </Button>
              {filesSelected && (
                <p className="text-[13px] text-[#aaa] mt-4">
                  Files selected: {filesSelected.selected} of {filesSelected.total}
                </p>
              )}
            </>
          )}

          {showSSEFeedback && (
            <div className="w-full">
              <ReusableSSEFeedback
                status={sseStatus}
                progress={sseProgress || 0}
                logs={sseLogs || []}
              />
              <AnalysisLoadingSkeleton />
            </div>
          )}
        </div>
      );
    }

    case 'private':
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Private Repository
          </div>
          <h2 className="text-[20px] font-semibold text-[#111] mb-2">Repository is Private</h2>
          <p className="text-base text-[#666]">{message || 'Analysis is not available for private repositories'}</p>
        </div>
      );

    case 'upgrade':
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {children}
        </div>
      );

    case 'ready':
      return <div data-testid="analysis-state-handler">{children}</div>;

    case 'auth-error':
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Authentication
          </div>
          <h2 className="text-[20px] font-semibold text-[#111] mb-2">
            GitHub Authentication Expired
          </h2>
          <p className="text-base text-[#666] mb-8 text-center max-w-md">
            Your GitHub session has expired or your access token is no longer valid.
            Please sign in again to continue.
          </p>
          <Button
            onClick={handleReSignIn}
            className="h-11 px-6 bg-[#111] hover:bg-[#333] text-white text-base font-medium rounded-md"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with GitHub
          </Button>
        </div>
      );

    default:
      return null;
  }
};
