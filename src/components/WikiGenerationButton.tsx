'use client';

import { useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
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
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<{ owner: string; repo: string; maxFiles: number; useChunking: boolean } | null>(null);

  // Use tRPC subscription for wiki generation
  trpc.wiki.generateWikiPages.useSubscription(
    generationConfig || { owner, repo, maxFiles: 200, useChunking: false },
    {
      enabled: shouldGenerate && !!generationConfig,
      onData: (event: any) => {
        if (event.type === 'progress') {
          setProgress(event.progress || 0);
          setStatusMessage(sanitizeText(event.message || ''));
        } else if (event.type === 'complete') {
          setProgress(100);
          setIsGenerating(false);
          setShouldGenerate(false);

          toast.success(`Wiki generated successfully! Version ${event.data.version}`, {
            description: `Created ${event.data.pages?.length || 0} pages using ${event.data.usage?.totalTokens || 0} tokens`,
          });

          // Refresh the page to show new wiki content
          if (hideViewButton) {
            router.refresh();
          } else {
            router.push(`/wiki/${owner}/${repo}`);
          }
        } else if (event.type === 'error') {
          setIsGenerating(false);
          setShouldGenerate(false);

          toast.error('Failed to generate wiki', {
            description: sanitizeText(event.message) || 'An unknown error occurred',
          });
        }
      },
    }
  );

  const handleGenerate = async (chunking: boolean) => {
    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('Starting wiki generation...');

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
    <div className="flex flex-col gap-2">
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
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{statusMessage}</p>
        </div>
      )}
    </div>
  );
}
