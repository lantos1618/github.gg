import React, { ReactNode, useCallback } from 'react';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import type { RepoFile } from '@/types/repo';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { parseBranchAndPath } from '@/lib/utils';

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
  const { data: branches = [] } = trpc.github.getBranches.useQuery({ owner: user, repo });

  // Handler to update the route when a branch is selected
  const handleBranchChange = useCallback((branch: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const treeIdx = segments.indexOf('tree');
    if (treeIdx === -1) return; // Defensive: only handle /tree/ URLs

    // Get the segments after /tree/
    const afterTree = segments.slice(treeIdx + 1).map(decodeURIComponent);
    // Find the current branch and path
    const { path } = parseBranchAndPath(afterTree, branches);
    // Build new segments: replace branch with new branch, preserve path
    const encodedBranch = encodeURIComponent(branch);
    const newSegments = [
      ...segments.slice(0, treeIdx + 1),
      encodedBranch,
      ...(path ? path.split('/') : [])
    ];
    router.push('/' + newSegments.join('/'));
  }, [pathname, router, branches]);

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