'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type SSEStatus = 'idle' | 'connecting' | 'processing' | 'complete' | 'error';

export interface SSELogItem {
  message: string;
  timestamp: Date;
  type?: 'info' | 'success' | 'error';
}

interface ReusableSSEFeedbackProps {
  status: SSEStatus;
  progress: number;
  currentStep?: string;
  logs?: SSELogItem[];
  title?: string;
  className?: string;
}

export function ReusableSSEFeedback({
  status,
  progress,
  className,
}: ReusableSSEFeedbackProps) {
  if (status === 'idle') return null;

  return (
    <div data-testid="analysis-sse-container" className={cn("w-full", className)}>
      <Progress
        data-testid="analysis-sse-progress"
        value={status === 'complete' ? 100 : progress}
        className="h-1 transition-all duration-500"
      />
    </div>
  );
}
