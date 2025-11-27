'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Book, Loader2, ExternalLink, Settings, Zap, FileText, CheckCircle2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { sanitizeText } from '@/lib/utils/sanitize';
import { trpc } from '@/lib/trpc/client';

interface WikiGenerationButtonProps {
  owner: string;
  repo: string;
  hideViewButton?: boolean;
}

type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

export function WikiGenerationButton({ owner, repo, hideViewButton = false }: WikiGenerationButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<Array<{ message: string; timestamp: Date }>>([]);
  const [generationConfig, setGenerationConfig] = useState<{ owner: string; repo: string; maxFiles: number; useChunking: boolean } | null>(null);
  const [resultStats, setResultStats] = useState<{ pages: number; tokens: number; version: number } | null>(null);
  
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

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open && status === 'generating') {
      // Prevent closing while generating
      return;
    }
    setIsOpen(open);
    if (!open && status === 'complete') {
      // Reset on close if complete
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
        setLogs([]);
        setResultStats(null);
      }, 500);
    }
  };

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
      setLogs(prev => [...prev, { message, timestamp: new Date() }]);
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
      setLogs(prev => [...prev, { message: '✨ Wiki generation complete!', timestamp: new Date() }]);
      
      toast.success('Wiki generated successfully!');
      
      // Refresh content in background
      router.refresh();
    } else if (event.type === 'error') {
      setStatus('error');
      const errorMsg = sanitizeText(event.message) || 'An unknown error occurred';
      setLogs(prev => [...prev, { message: `❌ Error: ${errorMsg}`, timestamp: new Date() }]);
      toast.error('Generation failed');
    }
  }, [router]);

  // Subscription hook
  trpc.wiki.generateWikiPages.useSubscription(
    subscriptionInput,
    {
      enabled: status === 'generating' && !!generationConfig,
      onData: handleSubscriptionData,
      onError: (err) => {
        setStatus('error');
        setLogs(prev => [...prev, { message: `❌ Connection Error: ${err.message}`, timestamp: new Date() }]);
      }
    }
  );

  const startGeneration = (chunking: boolean) => {
    setStatus('generating');
    setProgress(0);
    setLogs([{ message: '🚀 Initializing generation sequence...', timestamp: new Date() }]);
    setCurrentStep('Initializing...');
    
    setGenerationConfig({
      owner,
      repo,
      maxFiles: chunking ? 500 : 200,
      useChunking: chunking,
    });
  };

  const handleViewWiki = () => {
    setIsOpen(false);
    router.push(`/wiki/${owner}/${repo}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-2">
            <Book className="h-4 w-4" />
            Generate Wiki Docs
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Wiki Generator</DialogTitle>
            <DialogDescription>
              Create comprehensive documentation for your repository using Gemini AI.
            </DialogDescription>
          </DialogHeader>

          {status === 'idle' && (
            <div className="grid gap-4 py-4">
              <div 
                className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => startGeneration(false)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Standard Generation
                  </div>
                  <Badge variant="secondary">Fast</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Best for small to medium repositories (up to 200 files). Uses a single high-context pass.
                </p>
              </div>

              <div 
                className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => startGeneration(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <Settings className="h-5 w-5 text-blue-500" />
                    Deep Analysis (Chunking)
                  </div>
                  <Badge variant="secondary">Thorough</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Best for massive repositories (500+ files). Analyzes code in chunks for maximum detail.
                </p>
              </div>
            </div>
          )}

          {status === 'generating' && (
            <div className="py-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-primary">{currentStep}</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="border rounded-md bg-muted/50">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                  <Terminal className="h-3 w-3" />
                  Generation Log
                </div>
                <ScrollArea ref={scrollAreaRef} className="h-[200px] p-3">
                  <div className="space-y-1.5">
                    {logs.map((log, i) => (
                      <div key={i} className="text-xs font-mono flex gap-2 text-muted-foreground">
                        <span className="opacity-50 shrink-0">
                          {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className={i === logs.length - 1 ? 'text-foreground font-medium' : ''}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {status === 'complete' && (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Wiki Generated!</h3>
                <p className="text-sm text-muted-foreground">
                  Your documentation is ready to view.
                </p>
              </div>
              
              {resultStats && (
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto pt-2">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="text-2xl font-bold">{resultStats.pages}</div>
                    <div className="text-xs text-muted-foreground">Pages Created</div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="text-2xl font-bold">{(resultStats.tokens / 1000).toFixed(1)}k</div>
                    <div className="text-xs text-muted-foreground">Tokens Used</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
             <div className="py-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <Settings className="h-6 w-6" />
              </div>
               <div className="space-y-1">
                <h3 className="font-semibold text-lg">Generation Failed</h3>
                <p className="text-sm text-muted-foreground">
                  Something went wrong during the process.
                </p>
              </div>
               <Button variant="outline" onClick={() => setStatus('idle')}>Try Again</Button>
             </div>
          )}

          <DialogFooter>
            {status === 'complete' ? (
              <Button onClick={handleViewWiki} className="w-full sm:w-auto">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
            ) : (
              status === 'idle' && (
                <Button variant="ghost" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
              )
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!hideViewButton && (
        <Button
          onClick={() => router.push(`/wiki/${owner}/${repo}`)}
          size="sm"
          variant="ghost"
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          View Wiki
        </Button>
      )}
    </div>
  );
}
