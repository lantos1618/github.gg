'use client';

import React, { useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  logs = [],
  className,
}: ReusableSSEFeedbackProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  if (status === 'idle') return null;

  return (
    <div data-testid="analysis-sse-container" className={cn("w-full space-y-4", className)}>
      {/* Progress */}
      <div className="space-y-1.5" role="status" aria-live="polite" data-testid="analysis-sse-status">
        <div className="flex items-center justify-between text-[13px] text-[#aaa]">
          <span className="flex items-center gap-1.5">
            {status === 'complete' ? (
              <CheckCircle2 className="h-3 w-3 text-[#34a853]" />
            ) : status === 'error' ? (
              <AlertCircle className="h-3 w-3 text-[#ea4335]" />
            ) : null}
            <span className="font-mono">{Math.round(progress)}%</span>
          </span>
        </div>
        <Progress
          data-testid="analysis-sse-progress"
          value={status === 'complete' ? 100 : progress}
          className="h-1 transition-all duration-500"
        />
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="border border-[#eee] overflow-hidden rounded">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#eee] bg-[#f8f9fa] text-[13px] font-semibold text-[#aaa] tracking-[1px] uppercase">
            Live Logs
          </div>
          <ScrollArea ref={scrollAreaRef} className="h-[180px] p-3 bg-[#fafafa]">
            <div className="space-y-1 font-mono text-[13px]">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[#ccc] shrink-0 select-none">
                    {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={cn(
                    "break-all",
                    log.type === 'error' ? "text-[#ea4335]" :
                    log.type === 'success' ? "text-[#34a853]" :
                    i === logs.length - 1 ? "text-[#111] font-semibold" : "text-[#888]"
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
