'use client';

import { ReactNode } from 'react';
import { RepoSidebar } from '@/components/RepoSidebar';
import { RepoHeader } from '@/components/RepoHeader';
import { useRouter } from 'next/navigation';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { Footer } from '@/components/Footer';

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
    <div className="flex h-[calc(100vh-3.5rem)] bg-gray-50">
      {/* Optional Header */}
      {showHeader && (
        <div className={`fixed top-14 left-0 right-0 z-30 transition-all duration-300 ${isExpanded ? 'lg:left-64' : 'lg:left-16'}`}>
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
        </div>
      )}

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 min-w-0">
        <RepoSidebar
          owner={owner}
          repo={repo}
          wikiPages={wikiPages}
        />

        {/* Main Content */}
        <main className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${isExpanded ? 'lg:ml-64' : 'lg:ml-16'} ${showHeader ? 'pt-32' : ''}`}>
          <div className="flex-1">
            {children}
          </div>
          <Footer />
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
