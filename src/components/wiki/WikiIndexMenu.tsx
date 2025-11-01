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
import { useState, useMemo, useCallback, useRef } from 'react';
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<{ owner: string; repo: string; maxFiles: number; useChunking: boolean } | null>(null);
  const toastIdRef = useRef<string | number | null>(null);
  const routerForGen = useRouter();

  // Memoize the subscription input to prevent recreating on every render
  const subscriptionInput = useMemo(() => {
    return generationConfig || { owner, repo, maxFiles: 200, useChunking: false };
  }, [generationConfig, owner, repo]);

  // Memoize the subscription data handler to prevent recreating on every render
  const handleGenerationData = useCallback((event: any) => {
    if (event.type === 'progress') {
      const progress = event.progress || 0;
      const message = event.message || '';

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
      routerForGen.refresh();
    } else if (event.type === 'error') {
      setIsGenerating(false);
      setShouldGenerate(false);

      // Replace loading toast with error
      if (toastIdRef.current) {
        toast.error('Failed to generate wiki', {
          id: toastIdRef.current,
          description: event.message || 'An unknown error occurred',
        });
        toastIdRef.current = null;
      } else {
        toast.error('Failed to generate wiki', {
          description: event.message || 'An unknown error occurred',
        });
      }
    }
  }, [routerForGen]);

  // Use tRPC subscription for wiki generation inline
  trpc.wiki.generateWikiPages.useSubscription(
    subscriptionInput,
    {
      enabled: shouldGenerate && !!generationConfig,
      onData: handleGenerationData,
    }
  );

  const handleGenerate = (chunking: boolean) => {
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
            <DropdownMenuLabel>Generate Wiki Docs</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleGenerate(false)} disabled={isGenerating}>
              <Book className="h-4 w-4 mr-2" />
              <div className="flex flex-col">
                <span>Standard (up to 200 files)</span>
                <span className="text-xs text-muted-foreground">1M token context, single pass</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleGenerate(true)} disabled={isGenerating}>
              <Book className="h-4 w-4 mr-2" />
              <div className="flex flex-col">
                <span>Massive Repos (500+ files)</span>
                <span className="text-xs text-muted-foreground">Multi-pass chunking</span>
              </div>
            </DropdownMenuItem>

            {canEdit && (
              <>
                <DropdownMenuSeparator />
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
