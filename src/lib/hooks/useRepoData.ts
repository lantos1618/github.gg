import { trpc } from '@/lib/trpc/client';
import { useRepoStore } from '@/lib/store';
import { useEffect } from 'react';
import { RepoParams } from '@/types/repo';
import { DEFAULT_MAX_FILES } from '../github';

export function useRepoData(params: RepoParams, maxFiles: number = 300) {
  const { setFiles } = useRepoStore();
  
  const { data: repoData, isLoading, error } = trpc.github.files.useQuery({
    owner: params.user,
    repo: params.repo,
    maxFiles,
  });

  useEffect(() => {
    if (repoData?.files) {
      setFiles(repoData.files, repoData.totalFiles);
    }
  }, [repoData?.files, repoData?.totalFiles, setFiles]);

  return {
    data: repoData,
    isLoading,
    error,
    files: repoData?.files || []
  };
} 