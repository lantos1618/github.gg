'use client';

import { useParams } from 'next/navigation';
import { useRepoStore } from '@/lib/store';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { RepoHeader } from '@/components/RepoHeader';
import { RepoLayout } from '@/components/RepoLayout';
import { RepoStatus } from '@/components/RepoStatus';
import { FileList } from '@/components/FileList';

interface RepoTreePathParams {
  user: string;
  repo: string;
  ref: string;
  path: string;
  [key: string]: string;
}

export default function RepoTreePathPage() {
  const params = useParams<RepoTreePathParams>();
  
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
    path: params.path,
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
            {params.path && (
              <>
                {' • '}
                Path: <span className="font-mono">{params.path}</span>
              </>
            )}
          </div>
          <FileList files={files} />
        </>
      )}
    </RepoLayout>
  );
} 