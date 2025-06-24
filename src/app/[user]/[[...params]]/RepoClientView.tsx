"use client";

import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import { FileList } from '@/components/FileList';
import { RepoFile } from '@/types/repo';
import RepoSkeleton from '@/components/RepoSkeleton';
import RepoTabsBar from '@/components/RepoTabsBar';

interface RepoClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  currentPath: string;
  params: { user: string; repo?: string[] };
}

export default function RepoClientView({ user, repo, refName, path }: RepoClientViewProps) {
  const {
    files,
    totalFiles,
    isLoading,
  } = useRepoData({ user, repo, ref: refName, path });

  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files as RepoFile[]);

  return (
    <>
      <RepoHeader
        user={user}
        repo={repo}
        onCopyAll={copyAllContent}
        isCopying={isCopying}
        copied={copied}
        fileCount={totalFiles}
      />
      <RepoTabsBar user={user} repo={repo} refName={refName} path={path} />
      <div className="max-w-screen-xl w-full mx-auto px-4 mt-8">
        <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          {isLoading ? <RepoSkeleton /> : <FileList files={files as RepoFile[]} />}
        </div>
      </div>
    </>
  );
} 