'use client';

import { useState, useRef } from 'react';
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
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleGenerate = async (chunking: boolean) => {
    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('Starting wiki generation...');

    const maxFiles = chunking ? 500 : 200;
    const url = `/api/wiki/generate?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&maxFiles=${maxFiles}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data.progress || 0);
        setStatusMessage(sanitizeText(data.message));
      } catch (error) {
        console.error('Failed to parse progress event:', error);
      }
    });

    eventSource.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(100);
        setIsGenerating(false);
        eventSource.close();

        toast.success(`Wiki generated successfully! Version ${data.version}`, {
          description: `Created ${data.pages?.length || 0} pages using ${data.usage?.totalTokens || 0} tokens`,
        });

        // Refresh the page to show new wiki content
        if (hideViewButton) {
          // Already on wiki page, just refresh
          router.refresh();
        } else {
          // Navigate to wiki page
          router.push(`/wiki/${owner}/${repo}`);
        }
      } catch (error) {
        console.error('Failed to parse complete event:', error);
        setIsGenerating(false);
        eventSource.close();
        toast.error('Wiki generation completed but failed to parse results');
      }
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const messageEvent = event as MessageEvent;
        const data = messageEvent.data ? JSON.parse(messageEvent.data) : {};
        setIsGenerating(false);
        eventSource.close();

        toast.error('Failed to generate wiki', {
          description: sanitizeText(data.message) || 'An unknown error occurred',
        });
      } catch (error) {
        setIsGenerating(false);
        eventSource.close();
        toast.error('Failed to generate wiki', {
          description: 'An error occurred during generation',
        });
      }
    });

    eventSource.onerror = () => {
      setIsGenerating(false);
      eventSource.close();

      toast.error('Connection error', {
        description: 'Lost connection to the server',
      });
    };
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
