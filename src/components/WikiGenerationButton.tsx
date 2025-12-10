'use client';

import { useState, useMemo, useCallback } from 'react';
import { Book, ExternalLink, Settings, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { sanitizeText } from '@/lib/utils/sanitize';
import { trpc } from '@/lib/trpc/client';
import { ReusableSSEFeedback, SSEStatus, SSELogItem } from '@/components/analysis/ReusableSSEFeedback';

interface WikiGenerationButtonProps {
  owner: string;
  repo: string;
  hideViewButton?: boolean;
}

export function WikiGenerationButton({ owner, repo, hideViewButton = false }: WikiGenerationButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SSEStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<SSELogItem[]>([]);
  const [generationConfig, setGenerationConfig] = useState<{ owner: string; repo: string; maxFiles: number; useChunking: boolean } | null>(null);
  const [resultStats, setResultStats] = useState<{ pages: number; tokens: number; version: number } | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Memoize the subscription input
  const subscriptionInput = useMemo(() => {
    return generationConfig || { owner, repo, maxFiles: 200, useChunking: false };
  }, [generationConfig, owner, repo]);

  // Handle subscription data
  const handleSubscriptionData = useCallback((event: any) => {
    if (event.type === 'progress') {
      const newProgress = event.progress || 0;
      const message = sanitizeText(event.message || '');

      setProgress(newProgress);
      setCurrentStep(message);
      setLogs(prev => [...prev, { message, timestamp: new Date(), type: 'info' }]);
    } else if (event.type === 'ping') {
      // Keep-alive ping, just log it internally if needed
      console.debug('Wiki generation heartbeat');
    } else if (event.type === 'complete') {
      setStatus('complete');
      setProgress(100);
      setResultStats({
        pages: event.data.pages?.length || 0,
        tokens: event.data.usage?.totalTokens || 0,
        version: event.data.version,
      });
      setLogs(prev => [...prev, { message: '✨ Wiki generation complete!', timestamp: new Date(), type: 'success' }]);

      // Refresh content in background
      router.refresh();
    } else if (event.type === 'error') {
      setStatus('error');
      const errorMsg = sanitizeText(event.message) || 'An unknown error occurred';
      setLogs(prev => [...prev, { message: `Error: ${errorMsg}`, timestamp: new Date(), type: 'error' }]);
    }
  }, [router]);

  // Subscription hook
  trpc.wiki.generateWikiPages.useSubscription(
    subscriptionInput,
    {
      enabled: status === 'processing' && !!generationConfig,
      onData: handleSubscriptionData,
      onError: (err) => {
        setStatus('error');
        setLogs(prev => [...prev, { message: `Connection Error: ${err.message}`, timestamp: new Date(), type: 'error' }]);
      }
    }
  );

  const startGeneration = (chunking: boolean) => {
    setStatus('processing');
    setProgress(0);
    setLogs([{ message: 'Initializing generation sequence...', timestamp: new Date(), type: 'info' }]);
    setCurrentStep('Initializing...');
    setShowOptions(false);

    setGenerationConfig({
      owner,
      repo,
      maxFiles: chunking ? 500 : 200,
      useChunking: chunking,
    });
  };

  const resetState = () => {
    setStatus('idle');
    setProgress(0);
    setLogs([]);
    setResultStats(null);
    setShowOptions(false);
  };

  const handleViewWiki = () => {
    router.push(`/wiki/${owner}/${repo}`);
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => setShowOptions(!showOptions)}
          disabled={status === 'processing'}
        >
          <Book className="h-4 w-4" />
          Generate Wiki Docs
        </Button>

        {!hideViewButton && (
          <Button
            onClick={handleViewWiki}
            size="sm"
            variant="ghost"
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Wiki
          </Button>
        )}
      </div>

      {/* Generation options - inline, not modal */}
      {showOptions && status === 'idle' && (
        <div className="grid gap-3 p-4 border rounded-lg bg-card">
          <p className="text-sm text-muted-foreground">
            Create comprehensive documentation for your repository using Gemini AI.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors text-left"
              onClick={() => startGeneration(false)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Standard
                </div>
                <Badge variant="secondary">Fast</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Best for small to medium repos (up to 200 files).
              </p>
            </button>

            <button
              className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors text-left"
              onClick={() => startGeneration(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Settings className="h-5 w-5 text-blue-500" />
                  Deep Analysis
                </div>
                <Badge variant="secondary">Thorough</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Best for massive repos (500+ files). Analyzes in chunks.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* SSE Feedback - inline using the reusable component */}
      <ReusableSSEFeedback
        status={status}
        progress={progress}
        currentStep={currentStep}
        logs={logs}
        title="Generating Wiki..."
      />

      {/* Completion state */}
      {status === 'complete' && (
        <div className="p-4 border rounded-lg bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Wiki Generated!</h3>
              <p className="text-sm text-muted-foreground">
                Your documentation is ready to view.
              </p>
            </div>
          </div>

          {resultStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">{resultStats.pages}</div>
                <div className="text-xs text-muted-foreground">Pages Created</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">{(resultStats.tokens / 1000).toFixed(1)}k</div>
                <div className="text-xs text-muted-foreground">Tokens Used</div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleViewWiki} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Documentation
            </Button>
            <Button variant="outline" onClick={resetState}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10 space-y-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-destructive">Generation Failed</h3>
            <p className="text-sm text-muted-foreground">
              Something went wrong during the process. Check the logs above for details.
            </p>
          </div>
          <Button variant="outline" onClick={resetState}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
