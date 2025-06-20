'use client';

import { useRepoData } from '@/lib/hooks/useRepoData';
import { RepoLayout } from '@/components/RepoLayout';
import { RepoHeader } from '@/components/RepoHeader';
import { FileList } from '@/components/FileList';
import { RepoStatus } from '@/components/RepoStatus';
import { RepoHeaderSkeleton } from '@/components/RepoHeaderSkeleton';
import { FileListSkeleton } from '@/components/FileListSkeleton';

export default function RepoPage() {
  const { 
    params,
    isLoading, 
    error, 
    files, 
    totalFiles, 
    copyAllContent, 
    isCopying, 
    copied 
  } = useRepoData();

  return (
    <RepoLayout>
      <RepoStatus isLoading={isLoading} error={error} />
      {isLoading ? (
        <>
          <RepoHeaderSkeleton />
          <FileListSkeleton />
        </>
      ) : !error && (
        <>
          <RepoHeader
            user={params.user}
            repo={params.repo}
            onCopyAll={copyAllContent}
            isCopying={isCopying}
            copied={copied}
            fileCount={totalFiles}
          />
          <FileList files={files} />
        </>
      )}
    </RepoLayout>
  );
} 