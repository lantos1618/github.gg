import React, { ReactNode, useCallback } from 'react';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import type { RepoFile } from '@/types/repo';
import { useRouter, usePathname } from 'next/navigation';

interface RepoPageLayoutProps {
  user: string;
  repo: string;
  refName?: string;
  files?: RepoFile[];
  totalFiles?: number;
  children: ReactNode;
}

export default function RepoPageLayout({
  user,
  repo,
  refName = 'main',
  files = [],
  totalFiles = 0,
  children,
}: RepoPageLayoutProps) {
  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files);
  const router = useRouter();
  const pathname = usePathname();

  // Handler to update the route when a branch is selected
  const handleBranchChange = useCallback((branch: string) => {
    // Split the current path
    const segments = pathname.split('/').filter(Boolean);
    // Find the index of 'tree' if present
    const treeIdx = segments.indexOf('tree');
    let newSegments;
    const encodedBranch = encodeURIComponent(branch);
    if (treeIdx !== -1) {
      // Replace the branch after 'tree'
      newSegments = [
        ...segments.slice(0, treeIdx + 1),
        encodedBranch,
        ...segments.slice(treeIdx + 2)
      ];
    } else {
      // Insert 'tree' and branch after user/repo
      newSegments = [
        ...segments.slice(0, 2), // user, repo
        'tree',
        encodedBranch,
        ...segments.slice(2)
      ];
    }
    router.push('/' + newSegments.join('/'));
  }, [pathname, router]);

  return (
    <>
      <RepoHeader
        user={user}
        repo={repo}
        refName={refName}
        onBranchChange={handleBranchChange}
        onCopyAll={copyAllContent}
        isCopying={isCopying}
        copied={copied}
        fileCount={totalFiles}
      />
      <RepoTabsBar />
      {children}
    </>
  );
} 