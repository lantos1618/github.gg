'use client';

import { useParams } from 'next/navigation';
import { useRepoStore } from '@/lib/store';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { RepoLayout, RepoHeader, FileList, RepoStatus } from '@/components';

export default function RepoTreePage() {
  const params = useParams();
  const user = params.user as string;
  const repo = params.repo as string;
  const ref = params.ref as string;
  const { files, totalFiles, copyAllContent, isCopying, copied } = useRepoStore();

  const { isLoading, error } = useRepoData({ user, repo, ref });

  return (
    <RepoLayout>
      <RepoStatus isLoading={isLoading} error={error} />
      {!isLoading && !error && (
        <>
          <RepoHeader
            user={user}
            repo={repo}
            onCopyAll={copyAllContent}
            isCopying={isCopying}
            copied={copied}
            fileCount={totalFiles}
          />
          <div className="mb-4 text-sm text-gray-600">
            Branch: <span className="font-mono">{ref}</span>
          </div>
          <FileList files={files} />
        </>
      )}
    </RepoLayout>
  );
} 