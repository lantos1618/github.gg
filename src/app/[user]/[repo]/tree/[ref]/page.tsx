'use client';

import { useRepoData } from '@/lib/hooks/useRepoData';
import { RepoHeader } from '@/components/RepoHeader';
import { RepoLayout } from '@/components/RepoLayout';
import { RepoStatus } from '@/components/RepoStatus';
import { FileList } from '@/components/FileList';
import { RepoHeaderSkeleton } from '@/components/RepoHeaderSkeleton';
import { FileListSkeleton } from '@/components/FileListSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function RepoTreePage() {
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

  if (isLoading) {
    return (
      <RepoLayout>
        <RepoHeaderSkeleton />
        <div className="mb-4 text-sm text-gray-600">
          Branch: <Skeleton className="inline-block h-4 w-20" />
        </div>
        <FileListSkeleton />
      </RepoLayout>
    );
  }

  if (error) {
    return (
      <RepoLayout>
        <RepoStatus error={error} />
      </RepoLayout>
    );
  }

  return (
    <RepoLayout>
      <RepoHeader
        user={params.user}
        repo={params.repo}
        onCopyAll={copyAllContent}
        isCopying={isCopying}
        copied={copied}
        fileCount={totalFiles}
      />
      <div className="mb-4 text-sm text-gray-600">
        Branch: <span className="font-mono">{params.ref}</span>
      </div>
      <FileList files={files} />
    </RepoLayout>
  );
} 