'use client';

import { MoreVertical, Book, Plus, Trash2, Copy, ChevronDown } from 'lucide-react';
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
import { WikiGenerationButton } from '@/components/WikiGenerationButton';
import { getBaseUrl } from '@/lib/constants';

interface WikiPage {
  slug: string;
  title: string;
  content?: string;
}

interface WikiIndexMenuProps {
  owner: string;
  repo: string;
  pages: WikiPage[];
  canEdit: boolean;
}

export function WikiIndexMenu({ owner, repo, pages, canEdit }: WikiIndexMenuProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  const deleteWiki = trpc.wiki.deleteRepositoryWiki.useMutation({
    onSuccess: () => {
      toast.success('Wiki deleted successfully');
      router.push(`/${owner}/${repo}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Failed to delete wiki: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteWiki.mutate({ owner, repo });
    setIsDeleteDialogOpen(false);
  };

  const handleCopyAll = async () => {
    // Fetch all pages content and format
    const formatted = pages.map(page => `# ${page.title}\n\n[Content from /wiki/${owner}/${repo}/${page.slug}]`).join('\n\n---\n\n');
    navigator.clipboard.writeText(formatted);
    toast.success('All pages copied to clipboard!');
  };

  const handleCopyAllForChatGPT = async () => {
    const baseUrl = getBaseUrl();
    const wikiUrl = `${baseUrl}/wiki/${owner}/${repo}`;
    const pageList = pages.map(page => `- ${page.title} (${page.slug})`).join('\n');

    const formatted = `Wiki Index:\n\n${pageList}`;
    navigator.clipboard.writeText(formatted);

    const prompt = `Please visit this wiki and read through the pages: ${wikiUrl}\n\nPages available:\n${pageList}`;
    const encodedPrompt = encodeURIComponent(prompt);
    toast.success('Opening ChatGPT...');
    window.open(`https://chatgpt.com/?hints=search&q=${encodedPrompt}`, '_blank');
  };

  const handleCopyAllForClaude = async () => {
    const baseUrl = getBaseUrl();
    const wikiUrl = `${baseUrl}/wiki/${owner}/${repo}`;
    const pageList = pages.map(page => `- ${page.title} (${page.slug})`).join('\n');

    const formatted = `Wiki Index:\n\n${pageList}`;
    navigator.clipboard.writeText(formatted);

    const prompt = `Please visit this wiki and read through the pages: ${wikiUrl}\n\nPages available:\n${pageList}`;
    const encodedContent = encodeURIComponent(prompt);
    const claudeUrl = `https://claude.ai/new?q=${encodedContent}`;
    toast.success('Opening Claude with all pages...');
    window.open(claudeUrl, '_blank');
  };

  const handleNewPage = () => {
    router.push(`/wiki/${owner}/${repo}/new`);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Copy All Button with Dropdown */}
        {pages.length > 0 && canEdit && (
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAll}
              className="rounded-r-none border-r border-border"
            >
              <Copy className="h-4 w-4 mr-2" />
              <span>Copy Pages</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-l-none px-2">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopyAllForChatGPT}>
                  Open in ChatGPT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyAllForClaude}>
                  Open in Claude
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Three Dot Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setIsGenerateDialogOpen(true)}>
              <Book className="h-4 w-4 mr-2" />
              Generate Wiki Docs
            </DropdownMenuItem>

            {canEdit && (
              <>
                <DropdownMenuItem onClick={handleNewPage}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Page
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Pages
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Generate Wiki Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Wiki Documentation</DialogTitle>
            <DialogDescription>
              Choose a generation mode for your repository wiki.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <WikiGenerationButton owner={owner} repo={repo} hideViewButton />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Wiki Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleDelete}
              disabled={deleteWiki.isPending}
            >
              {deleteWiki.isPending ? 'Deleting...' : 'Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
