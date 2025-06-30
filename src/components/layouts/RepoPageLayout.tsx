import React, { ReactNode } from 'react';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import type { RepoFile } from '@/types/repo';

interface RepoPageLayoutProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  children: ReactNode;
}

export default function RepoPageLayout({
  user,
  repo,
  refName = 'main',
  path = '',
  children,
}: RepoPageLayoutProps) {
  const { files, totalFiles } = useRepoData({ user, repo, ref: refName, path });
  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files as RepoFile[]);

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