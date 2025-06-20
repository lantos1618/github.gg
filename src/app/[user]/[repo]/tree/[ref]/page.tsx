'use client';

import { useRepoData } from '@/lib/hooks/useRepoData';
import { RepoHeader } from '@/components/RepoHeader';
import { RepoLayout } from '@/components/RepoLayout';
import { RepoStatus } from '@/components/RepoStatus';
import { FileList } from '@/components/FileList';

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

  return (
    <RepoLayout>
      <RepoStatus isLoading={isLoading} error={error} />
      {!isLoading && !error && (
        <>
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
        </>
      )}
    </RepoLayout>
  );
} 