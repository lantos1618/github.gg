"use client";

import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';

export default function InsightsClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  const { files, totalFiles } = useRepoData({ user, repo });
  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files);

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
      <div className="max-w-screen-xl w-full mx-auto px-4 text-center mt-8">
        <h1>Insights View</h1>
        <p>This is where the insights for the repo would be rendered.</p>
      </div>
    </>
  );
} 