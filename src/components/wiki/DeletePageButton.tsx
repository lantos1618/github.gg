'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DeletePageButtonProps {
  owner: string;
  repo: string;
  slug: string;
}

export function DeletePageButton({ owner, repo, slug }: DeletePageButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const deletePage = trpc.wiki.deleteWikiPage.useMutation({
    onSuccess: () => {
      router.push(`/wiki/${owner}/${repo}`);
      router.refresh();
    },
    onError: (error) => {
      console.error('Failed to delete page:', error);
      setConfirming(false);
    },
  });

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-destructive font-medium mr-1">Delete page?</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => { deletePage.mutate({ owner, repo, slug }); }}
          disabled={deletePage.isPending}
        >
          {deletePage.isPending ? <span className="h-3 w-8 bg-destructive/20 rounded animate-pulse" /> : 'Yes'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setConfirming(false)}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
