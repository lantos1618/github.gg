'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeletePageButtonProps {
  owner: string;
  repo: string;
  slug: string;
}

export function DeletePageButton({ owner, repo, slug }: DeletePageButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const deletePage = trpc.wiki.deleteWikiPage.useMutation({
    onSuccess: () => {
      // Redirect to wiki index after successful deletion
      router.push(`/wiki/${owner}/${repo}`);
      router.refresh();
    },
    onError: (error) => {
      console.error('Failed to delete page:', error);
      alert(`Failed to delete page: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deletePage.mutate({ owner, repo, slug });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete This Page?</DialogTitle>
          <DialogDescription>
            This will permanently delete this wiki page. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleDelete}
            disabled={deletePage.isPending}
          >
            {deletePage.isPending ? 'Deleting...' : 'Delete Page'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
