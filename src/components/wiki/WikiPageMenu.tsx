'use client';

import { MoreVertical, Edit, Trash2, Copy, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WikiPageMenuProps {
  owner: string;
  repo: string;
  slug: string;
  pageTitle: string;
  pageContent: string;
}

export function WikiPageMenu({ owner, repo, slug, pageTitle, pageContent }: WikiPageMenuProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const deletePage = trpc.wiki.deleteWikiPage.useMutation({
    onSuccess: () => {
      toast.success('Page deleted successfully');
      router.push(`/wiki/${owner}/${repo}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Failed to delete page: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deletePage.mutate({ owner, repo, slug });
    setIsDeleteDialogOpen(false);
  };

  const handleCopy = () => {
    const formatted = `# ${pageTitle}\n\n${pageContent}`;
    navigator.clipboard.writeText(formatted);
    toast.success('Page copied to clipboard!');
  };

  const handleCopyForChatGPT = () => {
    const formatted = `# ${pageTitle}\n\n${pageContent}`;
    navigator.clipboard.writeText(formatted);
    const prompt = `Read the following wiki page so I can ask questions about it:\n\n${formatted}`;
    const encodedPrompt = encodeURIComponent(prompt);
    toast.success('Opening ChatGPT...');
    window.open(`https://chatgpt.com/?hints=search&q=${encodedPrompt}`, '_blank');
  };

  const handleCopyForClaude = () => {
    const formatted = `# ${pageTitle}\n\n${pageContent}`;
    const encodedContent = encodeURIComponent(formatted);
    const claudeUrl = `https://claude.ai/new?q=${encodedContent}`;
    toast.success('Opening Claude with page content...');
    window.open(claudeUrl, '_blank');
  };

  return (
    <>
      {/* Copy Button with Dropdown */}
      <div className="flex items-center border border-border rounded-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="rounded-r-none border-r border-border"
        >
          <Copy className="h-4 w-4 mr-2" />
          <span>Copy Page</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-l-none px-2">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopyForChatGPT}>
              Open in ChatGPT
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyForClaude}>
              Open in Claude
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Three Dot Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/wiki/${owner}/${repo}/${slug}/edit`} className="cursor-pointer">
              <Edit className="h-4 w-4 mr-2" />
              Edit Page
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
              onClick={() => setIsDeleteDialogOpen(false)}
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
    </>
  );
}
