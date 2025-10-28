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

interface DeleteWikiButtonProps {
  owner: string;
  repo: string;
}

export function DeleteWikiButton({ owner, repo }: DeleteWikiButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const deleteWiki = trpc.wiki.deleteRepositoryWiki.useMutation({
    onSuccess: () => {
      // Redirect to repository page after successful deletion
      router.push(`/${owner}/${repo}`);
      router.refresh();
    },
    onError: (error) => {
      console.error('Failed to delete wiki:', error);
      alert(`Failed to delete wiki: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteWiki.mutate({ owner, repo });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Repository Wiki?</DialogTitle>
          <DialogDescription>
            This will permanently delete all wiki documentation for {owner}/{repo}.
            This action cannot be undone.
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
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteWiki.isPending}
          >
            {deleteWiki.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
