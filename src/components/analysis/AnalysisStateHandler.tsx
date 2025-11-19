'use client';

import React, { ReactNode } from 'react';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { LoadingPage } from '@/components/common';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

type AnalysisState = 'loading' | 'error' | 'no-data' | 'ready' | 'private' | 'upgrade';

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
}) => {
  switch (state) {
    case 'loading':
      return <LoadingPage text={message || 'Loading analysis...'} />;

    case 'error':
      return (
        <ErrorDisplay
          error={error || 'An error occurred'}
          isPending={isRegenerating}
          onRetry={onRegenerate}
        />
      );

    case 'no-data':
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
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

    default:
      return null;
  }
};
