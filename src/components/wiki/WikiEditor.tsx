'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MilkdownEditor } from '@/components/ui/MilkdownEditor';
import { toast } from 'sonner';

interface WikiEditorProps {
  owner: string;
  repo: string;
  slug?: string;
  initialTitle?: string;
  initialContent?: string;
  initialSummary?: string;
  mode: 'create' | 'edit';
}

export function WikiEditor({
  owner,
  repo,
  slug: initialSlug,
  initialTitle = '',
  initialContent = '',
  initialSummary = '',
  mode,
}: WikiEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug || '');
  const [content, setContent] = useState(initialContent);
  const [summary, setSummary] = useState(initialSummary);

  const createPage = trpc.wiki.createWikiPage.useMutation({
    onSuccess: (data) => {
      toast.success('Wiki page created successfully!');
      router.push(`/wiki/${owner}/${repo}/${data.page.slug}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Failed to create page: ${error.message}`);
    },
  });

  const updatePage = trpc.wiki.updateWikiPage.useMutation({
    onSuccess: () => {
      toast.success('Wiki page updated successfully!');
      router.push(`/wiki/${owner}/${repo}/${initialSlug}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Failed to update page: ${error.message}`);
    },
  });

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Auto-generate slug from title only in create mode
    if (mode === 'create') {
      const generatedSlug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  };

  const handleSave = () => {
    if (mode === 'create') {
      createPage.mutate({
        owner,
        repo,
        slug,
        title,
        content,
        summary: summary || undefined,
      });
    } else {
      updatePage.mutate({
        owner,
        repo,
        slug: initialSlug!,
        title,
        content,
        summary: summary || undefined,
      });
    }
  };

  const handleCancel = () => {
    if (mode === 'edit') {
      router.push(`/wiki/${owner}/${repo}/${initialSlug}`);
    } else {
      router.push(`/wiki/${owner}/${repo}`);
    }
  };

  const isLoading = createPage.isPending || updatePage.isPending;
  const canSave = title.trim() && content.trim() && (mode === 'edit' || slug.trim());

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Page title"
          className="text-lg"
          disabled={isLoading}
        />
      </div>

      {/* Slug (only for create mode) */}
      {mode === 'create' && (
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL path)</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="page-slug"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Will be used in the URL: /wiki/{owner}/{repo}/{slug || 'page-slug'}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="space-y-2">
        <Label htmlFor="summary">Summary (optional)</Label>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief description of the page"
          disabled={isLoading}
        />
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <Label>Content (Markdown)</Label>
        <MilkdownEditor
          content={content}
          onChange={setContent}
          placeholder="Write your markdown content here..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-6 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={!canSave || isLoading}
          size="lg"
        >
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Page' : 'Save Changes'}
        </Button>
        <Button
          onClick={handleCancel}
          variant="outline"
          disabled={isLoading}
          size="lg"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
