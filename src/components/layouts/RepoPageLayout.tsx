import React, { ReactNode } from 'react';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import type { RepoFile } from '@/types/repo';

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

  return (
    <>
      <RepoHeader
        user={user}
        repo={repo}
        refName={refName}
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