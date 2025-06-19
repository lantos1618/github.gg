'use client';

import { useParams } from 'next/navigation';
import { useRepoStore } from '@/lib/store';
import { useEffect } from 'react';
import { RepoLayout, RepoHeader, FileList, RepoStatus } from '@/components';
import { trpc } from '@/lib/trpc/client';

interface RepoPageParams {
  user: string;
  repo: string;
  [key: string]: string;
}

export default function RepoPage() {
  const params = useParams<RepoPageParams>();
  
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
          <FileList files={files} />
        </>
      )}
    </RepoLayout>
  );
} 