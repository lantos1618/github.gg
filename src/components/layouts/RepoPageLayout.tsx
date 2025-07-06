import React, { ReactNode, useCallback } from 'react';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import type { RepoFile } from '@/types/repo';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

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
    try {
      const segments = pathname.split('/').filter(Boolean);
      const treeIdx = segments.indexOf('tree');
      let pathSegments: string[] = [];
      if (treeIdx !== -1) {
        // Find the current branch by matching against known branches
        let currentBranch = '';
        for (let i = segments.length - (treeIdx + 1); i > 0; i--) {
          const candidate = segments.slice(treeIdx + 1, treeIdx + 1 + i).map(decodeURIComponent).join('/');
          if (branches.includes(candidate)) {
            currentBranch = candidate;
            pathSegments = segments.slice(treeIdx + 1 + i);
            break;
          }
        }
        // If no branch found, assume first segment is branch
        if (!currentBranch && segments.length > treeIdx + 1) {
          pathSegments = segments.slice(treeIdx + 2);
        }
      }
      // Build new path: encode only the branch, not the slashes or path segments
      const newPath = `/${user}/${repo}/tree/${encodeURIComponent(branch)}${pathSegments.length ? '/' + pathSegments.join('/') : ''}`;
      router.push(newPath);
    } catch (error) {
      console.error('Error handling branch change:', error);
      // Fallback: construct a simple tree URL
      const fallbackPath = `/${user}/${repo}/tree/${encodeURIComponent(branch)}`;
      router.push(fallbackPath);
    }
  }, [pathname, router, branches, user, repo]);

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