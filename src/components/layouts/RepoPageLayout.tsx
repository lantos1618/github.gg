'use client';

import React, { ReactNode } from 'react';
import { RepoSidebar } from '@/components/RepoSidebar';
import { trpc } from '@/lib/trpc/client';
import type { RepoFile } from '@/types/repo';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { SelectedFilesProvider } from '@/contexts/SelectedFilesContext';

interface RepoPageLayoutProps {
  user: string;
  repo: string;
  refName?: string;
  files?: RepoFile[];
  totalFiles?: number;
  children: ReactNode;
}

function RepoPageLayoutContent({
  user,
  repo,
  files,
  children,
}: RepoPageLayoutProps) {
  const { isExpanded } = useSidebar();

  // Fetch wiki pages for sidebar
  const { data: wikiToc } = trpc.wiki.getWikiTableOfContents.useQuery(
    { owner: user, repo },
    { enabled: !!user && !!repo }
  );
  const wikiPages = wikiToc?.pages.map(p => ({ slug: p.slug, title: p.title })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <RepoSidebar owner={user} repo={repo} wikiPages={wikiPages} />

      <div className={`min-h-screen transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <SelectedFilesProvider files={files}>
          {children}
        </SelectedFilesProvider>
      </div>
    </div>
  );
}

export default function RepoPageLayout(props: RepoPageLayoutProps) {
  return (
    <SidebarProvider>
      <RepoPageLayoutContent {...props} />
    </SidebarProvider>
  );
} 