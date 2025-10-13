'use client';

import { useState } from 'react';
import { Book, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface WikiGenerationButtonProps {
  owner: string;
  repo: string;
}

export function WikiGenerationButton({ owner, repo }: WikiGenerationButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info('Generating wiki documentation...', {
      description: 'This may take a minute. Analyzing your codebase with AI.',
    });

    try {
      await generateWiki.mutateAsync({
        owner,
        repo,
        maxFiles: 50,
      });
    } catch (error) {
      // Error handled in onError callback
      console.error('Wiki generation error:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Wiki...
          </>
        ) : (
          <>
            <Book className="h-4 w-4" />
            Generate Wiki Docs
          </>
        )}
      </Button>
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
