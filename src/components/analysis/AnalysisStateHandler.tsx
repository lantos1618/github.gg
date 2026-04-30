'use client';

import React, { ReactNode } from 'react';
import { AnalysisErrorDisplay } from '@/components/ui/analysis-error-display';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth/client';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import { formatFileSize } from '@/components/file-browser/shared-utils';

function AnalysisLoadingSkeleton() {
  return (
    <PageWidthContainer className="pt-6 space-y-4">
      <div className="animate-pulse rounded-md bg-gray-200 h-6 w-48" />
      <div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />
      <div className="space-y-3 mt-6">
        <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
      </div>
    </PageWidthContainer>
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
  contextBudget?: {
    selectedBytes: number;
    totalBytes: number;
    selectedCount: number;
    totalCount: number;
  };
  children?: ReactNode;
  sseStatus?: SSEStatus;
  sseProgress?: number;
  sseCurrentStep?: string;
  sseLogs?: SSELogItem[];
  sseTitle?: string;
}

function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `~${tokens} tok`;
  return `~${(tokens / 1000).toFixed(1)}k tok`;
}

export const AnalysisStateHandler: React.FC<AnalysisStateHandlerProps> = ({
  state,
  error,
  isRegenerating = false,
  onRegenerate,
  message,
  title,
  description,
  contextBudget,
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
        <div className="space-y-6">
          <AnalysisErrorDisplay
            error={error || 'An error occurred'}
            isPending={isRegenerating}
            onRetry={onRegenerate}
          />
          {sseLogs && sseLogs.length > 0 && (
            <PageWidthContainer>
              <ReusableSSEFeedback
                status={sseStatus || 'error'}
                progress={sseProgress || 0}
                logs={sseLogs}
              />
            </PageWidthContainer>
          )}
        </div>
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
              {contextBudget && (
                <div className="mt-4 text-center">
                  <p className="text-[13px] text-[#666]">
                    Context: <span className="font-mono">{formatFileSize(contextBudget.selectedBytes)}</span>
                    {' · '}
                    <span className="font-mono">{formatTokenCount(Math.round(contextBudget.selectedBytes / 4))}</span>
                  </p>
                  <p className="text-[12px] text-[#aaa] mt-1">
                    {contextBudget.selectedCount} of {contextBudget.totalCount} files
                    {contextBudget.totalBytes > 0 && contextBudget.selectedBytes < contextBudget.totalBytes && (
                      <> · repo total {formatFileSize(contextBudget.totalBytes)}</>
                    )}
                  </p>
                </div>
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
