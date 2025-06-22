'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useRepoStore } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from './useAuth';
import { POPULAR_REPOS } from '../constants';
import { RepoSummary } from '../github/types';

interface RepoParams {
  user: string;
  repo: string;
  ref?: string;
  path?: string | string[];
  [key: string]: string | string[] | undefined;
}

export function useRepoData() {
  const params = useParams<RepoParams>();
  const store = useRepoStore();

  // Normalize path parameter
  const path = params.path 
    ? (Array.isArray(params.path) ? params.path.join('/') : params.path)
    : undefined;

  const { data, isLoading, error } = trpc.github.files.useQuery({
    owner: params.user,
    repo: params.repo,
    ref: params.ref,
    path: path,
  });

  useEffect(() => {
    if (data) {
      // Convert GitHubFile[] to RepoFile[] format
      const repoFiles = data.files.map(file => ({
        path: file.path,
        content: file.content || '',
        size: file.size,
      }));
      store.setFiles(repoFiles, data.totalFiles);
    }
  }, [data]);

  return {
    params,
    isLoading,
    error,
    files: store.files,
    totalFiles: store.totalFiles,
    copyAllContent: store.copyAllContent,
    isCopying: store.isCopying,
    copied: store.copied,
  };
} 

export const useReposForScrolling = (
  limit: number = 64, 
  options: Parameters<typeof trpc.github.getReposForScrolling.useQuery>[1] = {}
) => {
  const auth = useAuth();
  
  const getInitialData = (): RepoSummary[] => {
    return POPULAR_REPOS.slice(0, limit).map(r => ({ 
      ...r, 
      stargazersCount: 0, 
      forksCount: 0,
      description: '' 
    }));
  };

  const query = trpc.github.getReposForScrolling.useQuery(
    { limit }, 
    {
      enabled: !auth.isLoading,
      initialData: getInitialData(),
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.data?.code === 'UNAUTHORIZED') {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      ...options,
    }
  );

  return {
    ...query,
    data: query.data as RepoSummary[] | undefined,
  };
}; 