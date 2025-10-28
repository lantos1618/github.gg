'use client';

import { ReactNode } from 'react';
import { RepoSidebar } from '@/components/RepoSidebar';
import { RepoHeader } from '@/components/RepoHeader';
import { useRouter } from 'next/navigation';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';

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

// Inner component that consumes the sidebar context
function RepoSidebarLayoutInner({
  owner,
  repo,
  children,
  showHeader = false,
  refName = 'main',
  wikiPages = [],
}: RepoSidebarLayoutProps) {
  const router = useRouter();
  const { isExpanded } = useSidebar();

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
        <main className={`flex-1 min-h-screen transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-16'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Outer component that provides the sidebar context
export function RepoSidebarLayout(props: RepoSidebarLayoutProps) {
  return (
    <SidebarProvider>
      <RepoSidebarLayoutInner {...props} />
    </SidebarProvider>
  );
}
