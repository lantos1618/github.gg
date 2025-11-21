'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { RepoSidebarLayout } from '@/components/layouts/RepoSidebarLayout';
import { WikiEditor } from '@/components/wiki/WikiEditor';

interface EditWikiClientProps {
  owner: string;
  repo: string;
  slug: string;
  initialTitle: string;
  initialContent: string;
  initialSummary: string;
  wikiPages: { slug: string; title: string }[];
}

export function EditWikiClient({
  owner,
  repo,
  slug,
  initialTitle,
  initialContent,
  initialSummary,
  wikiPages,
}: EditWikiClientProps) {
  return (
    <RepoSidebarLayout owner={owner} repo={repo} wikiPages={wikiPages}>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-border">
            <Link
              href={`/wiki/${owner}/${repo}/${slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to page</span>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Edit Wiki Page</h1>
          </div>

          {/* Editor */}
          <WikiEditor
            owner={owner}
            repo={repo}
            slug={slug}
            initialTitle={initialTitle}
            initialContent={initialContent}
            initialSummary={initialSummary}
            mode="edit"
          />
        </div>
      </div>
    </RepoSidebarLayout>
  );
}

