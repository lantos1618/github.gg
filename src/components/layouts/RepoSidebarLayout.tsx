'use client';

import { ReactNode } from 'react';
import { RepoSidebar } from '@/components/RepoSidebar';
import { RepoHeader } from '@/components/RepoHeader';
import { useRouter } from 'next/navigation';

interface WikiPage {
  slug: string;
  title: string;
}

interface RepoSidebarLayoutProps {
  owner: string;
  repo: string;
  children: ReactNode;
  showHeader?: boolean;
  refName?: string;
  wikiPages?: WikiPage[];
}

export function RepoSidebarLayout({
  owner,
  repo,
  children,
  showHeader = false,
  refName = 'main',
  wikiPages = [],
}: RepoSidebarLayoutProps) {
  const router = useRouter();

  const handleBranchChange = (branch: string) => {
    router.push(`/${owner}/${repo}/tree/${branch}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Optional Header */}
      {showHeader && (
        <RepoHeader
          user={owner}
          repo={repo}
          refName={refName}
          onBranchChange={handleBranchChange}
          onCopyAll={() => {}}
          onDownloadAll={() => {}}
          isCopying={false}
          copied={false}
          fileCount={0}
        />
      )}

      {/* Main Layout with Sidebar */}
      <div className="flex">
        <RepoSidebar owner={owner} repo={repo} wikiPages={wikiPages} />

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
