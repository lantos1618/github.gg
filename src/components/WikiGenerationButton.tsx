'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Book, Loader2, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sanitizeText } from '@/lib/utils/sanitize';
import { trpc } from '@/lib/trpc/client';

interface WikiGenerationButtonProps {
  owner: string;
  repo: string;
  hideViewButton?: boolean;
}

export function WikiGenerationButton({ owner, repo, hideViewButton = false }: WikiGenerationButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<{ owner: string; repo: string; maxFiles: number; useChunking: boolean } | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Memoize the subscription input to prevent recreating on every render
  const subscriptionInput = useMemo(() => {
    return generationConfig || { owner, repo, maxFiles: 200, useChunking: false };
  }, [generationConfig, owner, repo]);

  // Memoize the subscription data handler to prevent recreating on every render
  const handleSubscriptionData = useCallback((event: any) => {
    if (event.type === 'progress') {
      const progress = event.progress || 0;
      const message = sanitizeText(event.message || '');

      // Update or create toast with progress
      if (toastIdRef.current) {
        toast.loading(`${message} (${progress}%)`, { id: toastIdRef.current });
      } else {
        const id = toast.loading(`${message} (${progress}%)`);
        toastIdRef.current = id;
      }
    } else if (event.type === 'complete') {
      setIsGenerating(false);
      setShouldGenerate(false);

      // Replace loading toast with success
      if (toastIdRef.current) {
        toast.success(`Wiki generated successfully! Version ${event.data.version}`, {
          id: toastIdRef.current,
          description: `Created ${event.data.pages?.length || 0} pages using ${event.data.usage?.totalTokens || 0} tokens`,
        });
        toastIdRef.current = null;
      } else {
        toast.success(`Wiki generated successfully! Version ${event.data.version}`, {
          description: `Created ${event.data.pages?.length || 0} pages using ${event.data.usage?.totalTokens || 0} tokens`,
        });
      }

      // Refresh the page to show new wiki content
      if (hideViewButton) {
        router.refresh();
      } else {
        router.push(`/wiki/${owner}/${repo}`);
      }
    } else if (event.type === 'error') {
      setIsGenerating(false);
      setShouldGenerate(false);

      // Replace loading toast with error
      if (toastIdRef.current) {
        toast.error('Failed to generate wiki', {
          id: toastIdRef.current,
          description: sanitizeText(event.message) || 'An unknown error occurred',
        });
        toastIdRef.current = null;
      } else {
        toast.error('Failed to generate wiki', {
          description: sanitizeText(event.message) || 'An unknown error occurred',
        });
      }
    }
  }, [hideViewButton, owner, repo, router]);

  // Use tRPC subscription for wiki generation
  trpc.wiki.generateWikiPages.useSubscription(
    subscriptionInput,
    {
      enabled: shouldGenerate && !!generationConfig,
      onData: handleSubscriptionData,
    }
  );

  const handleGenerate = async (chunking: boolean) => {
    setIsGenerating(true);

    const maxFiles = chunking ? 500 : 200;
    setGenerationConfig({
      owner,
      repo,
      maxFiles,
      useChunking: chunking,
    });
    setShouldGenerate(true);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isGenerating}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Book className="h-4 w-4" />
                Generate Wiki Docs
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Generation Mode</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleGenerate(false)}>
            <Book className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Standard (up to 200 files)</span>
              <span className="text-xs text-muted-foreground">1M token context, single pass</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleGenerate(true)}>
            <Settings className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Massive Repos (500+ files)</span>
              <span className="text-xs text-muted-foreground">Multi-pass chunking at 800k tokens/chunk</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
