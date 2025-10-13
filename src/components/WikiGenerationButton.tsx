'use client';

import { useState } from 'react';
import { Book, Loader2, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
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

interface WikiGenerationButtonProps {
  owner: string;
  repo: string;
}

export function WikiGenerationButton({ owner, repo }: WikiGenerationButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [useChunking, setUseChunking] = useState(false);

  const generateWiki = trpc.wiki.generateWikiPages.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      toast.success(`Wiki generated successfully! Version ${data.version}`, {
        description: `Created ${data.pages.length} pages using ${data.usage.totalTokens} tokens`,
      });
      // Navigate to the wiki
      router.push(`/wiki/${owner}/${repo}`);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error('Failed to generate wiki', {
        description: error.message,
      });
    },
  });

  const handleGenerate = async (chunking: boolean) => {
    setIsGenerating(true);
    setUseChunking(chunking);

    toast.info(`Generating wiki documentation${chunking ? ' with chunking' : ''}...`, {
      description: chunking
        ? 'Massive repo detected. Using multi-pass chunking strategy.'
        : 'Analyzing codebase with 1M token context window.',
    });

    try {
      await generateWiki.mutateAsync({
        owner,
        repo,
        maxFiles: chunking ? 500 : 200, // Standard: 200 files (~800k tokens), Chunked: 500+ files
        useChunking: chunking,
        tokensPerChunk: 800000, // 800k tokens per chunk (utilizing 1M context window)
      });
    } catch (error) {
      // Error handled in onError callback
      console.error('Wiki generation error:', error);
    }
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
                {useChunking ? 'Chunking & Stitching...' : 'Generating Wiki...'}
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
      <Button
        onClick={() => router.push(`/wiki/${owner}/${repo}`)}
        size="sm"
        variant="ghost"
        className="gap-2"
      >
        <ExternalLink className="h-4 w-4" />
        View Wiki
      </Button>
    </div>
  );
}
