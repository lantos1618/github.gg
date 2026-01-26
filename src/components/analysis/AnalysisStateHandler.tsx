'use client';

import React, { ReactNode } from 'react';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth/client';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';

// Skeleton layout that matches the analysis content structure
function AnalysisLoadingSkeleton() {
  return (
    <div className="max-w-screen-xl w-full mx-auto px-2 sm:px-4 pt-2 sm:pt-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full mt-4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
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
  // SSE feedback props for showing logs during generation
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
  sseCurrentStep,
  sseLogs,
  sseTitle,
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
        <ErrorDisplay
          error={error || 'An error occurred'}
          isPending={isRegenerating}
          onRetry={onRegenerate}
        />
      );

    case 'no-data':
      // Show SSE feedback when generating (similar to wiki page)
      const showSSEFeedback = isRegenerating && sseStatus && sseStatus !== 'idle';
      
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
          {!showSSEFeedback && (
            <>
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                {title || 'No analysis available'}
              </h2>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                {description || 'Generate an analysis to get started'}
              </p>
              <Button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2"
                size="lg"
              >
                <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Generating...' : 'Generate Analysis'}
              </Button>
              {filesSelected && (
                <p className="text-sm text-gray-400 mt-4">
                  Files selected: {filesSelected.selected} of {filesSelected.total}
                </p>
              )}
            </>
          )}
          
          {showSSEFeedback && (
            <div className="w-full max-w-2xl space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-gray-600 mb-2">
                  {title || 'No analysis available'}
                </h2>
                {filesSelected && (
                  <p className="text-sm text-gray-400">
                    Files selected: {filesSelected.selected} of {filesSelected.total}
                  </p>
                )}
              </div>
              <ReusableSSEFeedback
                status={sseStatus}
                progress={sseProgress || 0}
                currentStep={sseCurrentStep || ''}
                logs={sseLogs || []}
                title={sseTitle || 'Generating...'}
              />
            </div>
          )}
        </div>
      );

    case 'private':
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Repository is Private</h2>
          <p className="text-gray-500">{message || 'Analysis is not available for private repositories'}</p>
        </div>
      );

    case 'upgrade':
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {children}
        </div>
      );

    case 'ready':
      return <>{children}</>;

    case 'auth-error':
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            GitHub Authentication Expired
          </h2>
          <p className="text-gray-500 mb-6 text-center max-w-md">
            Your GitHub session has expired or your access token is no longer valid.
            Please sign in again to continue.
          </p>
          <Button
            onClick={handleReSignIn}
            className="flex items-center gap-2"
            size="lg"
          >
            <LogIn className="h-4 w-4" />
            Sign in with GitHub
          </Button>
        </div>
      );

    default:
      return null;
  }
};
