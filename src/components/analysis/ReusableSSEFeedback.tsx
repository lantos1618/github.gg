'use client';

import React, { useRef, useEffect } from 'react';
import { Loader2, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
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
  currentStep: string;
  logs: SSELogItem[];
  title?: string;
  className?: string;
}

export function ReusableSSEFeedback({
  status,
  progress,
  currentStep,
  logs,
  title = 'Processing...',
  className,
}: ReusableSSEFeedbackProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
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
    <div className={cn("space-y-6 animate-in fade-in duration-300", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary flex items-center gap-2">
            {status === 'processing' || status === 'connecting' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : status === 'complete' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : status === 'error' ? (
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            ) : null}
            {currentStep || title}
          </span>
          <span className="text-muted-foreground font-mono text-xs">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 transition-all duration-500" />
      </div>

      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span>Live Logs</span>
        </div>
        <ScrollArea ref={scrollAreaRef} className="h-[200px] p-3 bg-black/5 dark:bg-black/20">
          <div className="space-y-1.5 font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 items-start animate-in slide-in-from-left-1 duration-200">
                <span className="text-muted-foreground/50 shrink-0 select-none">
                  {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={cn(
                  "break-all",
                  log.type === 'error' ? "text-destructive" :
                  log.type === 'success' ? "text-green-600 dark:text-green-400" :
                  i === logs.length - 1 ? "text-foreground font-semibold" : "text-muted-foreground"
                )}>
                  {log.message}
                </span>
              </div>
            ))}
            {(status === 'processing' || status === 'connecting') && (
              <div className="flex gap-2 items-center text-muted-foreground/50 animate-pulse">
                <span className="invisible">00:00:00</span>
                <span className="w-2 h-4 bg-primary/50 block" />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

