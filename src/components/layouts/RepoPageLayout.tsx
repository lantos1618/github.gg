'use client';

import React, { ReactNode } from 'react';
import { RepoSidebar } from '@/components/RepoSidebar';
import { trpc } from '@/lib/trpc/client';
import type { RepoFile } from '@/types/repo';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { SelectedFilesProvider } from '@/contexts/SelectedFilesContext';
import { Footer } from '@/components/Footer';

interface RepoPageLayoutProps {
  user: string;
  repo: string;
  refName?: string;
  files?: RepoFile[];
  totalFiles?: number;
  children: ReactNode;
  onToggleFileExplorer?: () => void;
  fileExplorerState?: {
    isFileExplorerOpen: boolean;
    setIsFileExplorerOpen: (open: boolean) => void;
  };
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
    <div className="flex h-[calc(100vh-3.5rem)] bg-gray-50">
      <RepoSidebar
        owner={user}
        repo={repo}
        wikiPages={wikiPages}
      />

      <main className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <SelectedFilesProvider files={files}>
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </SelectedFilesProvider>
      </main>
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