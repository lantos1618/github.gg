import React from 'react';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import { RepoFile } from '@/types/repo';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

interface RepoPageLayoutProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  tab?: string;
  currentPath?: string;
  children: (data: {
    files: RepoFile[];
    totalFiles: number;
    isLoading: boolean;
    error: any;
    copyAllContent: () => void;
    isCopying: boolean;
    copied: boolean;
  }) => React.ReactNode;
}

export default function RepoPageLayout({
  user,
  repo,
  refName,
  path,
  tab,
  children,
}: RepoPageLayoutProps) {
  const { files, totalFiles, isLoading, error } = useRepoData({ user, repo, ref: refName, path });
  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files as RepoFile[]);
  const router = useRouter();

  // Fetch default branch
  const { data: repoMeta } = trpc.github.getRepoMeta.useQuery({ owner: user, repo });
  const defaultBranch = repoMeta?.default_branch;

  // Unified branch change handler
  const handleBranchChange = (branch: string) => {
    let newPath = `/${user}/${repo}/tree/${branch}`;
    if (path) newPath += `/${path}`;
    if (tab) newPath += `/${tab}`;
    router.push(newPath);
  };

  return (
    <>
      <RepoHeader
        user={user}
        repo={repo}
        refName={refName}
        defaultBranch={defaultBranch}
        onBranchChange={handleBranchChange}
        onCopyAll={copyAllContent}
        isCopying={isCopying}
        copied={copied}
        fileCount={totalFiles}
      />
      <RepoTabsBar />
      {children({ files, totalFiles, isLoading, error, copyAllContent, isCopying, copied })}
    </>
  );
} 