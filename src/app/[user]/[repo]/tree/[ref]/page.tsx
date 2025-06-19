'use client';

import { useParams } from 'next/navigation';
import { useRepoStore } from '@/lib/store';
import { useEffect } from 'react';
import { RepoLayout, RepoHeader, FileList, RepoStatus } from '@/components';
import { trpc } from '@/lib/trpc/client';

interface RepoTreeParams {
  user: string;
  repo: string;
  ref: string;
  [key: string]: string;
}

export default function RepoTreePage() {
  const params = useParams<RepoTreeParams>();
  
  const { 
    files, 
    totalFiles, 
    copyAllContent, 
    isCopying, 
    copied,
    setFiles
  } = useRepoStore();

  const { data, isLoading, error } = trpc.github.files.useQuery({
    owner: params.user,
    repo: params.repo,
    ref: params.ref,
  });

  useEffect(() => {
    if (data) {
      setFiles(data.files, data.totalFiles);
    }
  }, [data, setFiles]);

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