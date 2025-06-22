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
  options: Parameters<typeof trpc.github.getReposForScrollingCached.useQuery>[1] = {}
) => {
  const auth = useAuth();

  const query = trpc.github.getReposForScrollingCached.useQuery(
    { limit }, 
    {
      enabled: !auth.isLoading,
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.data?.code === 'UNAUTHORIZED') {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      ...options,
    }
  );

  return {
    ...query,
    data: query.data as RepoSummary[] | undefined,
  };
};

export const useUserReposForScrolling = (
  limit: number = 10,
  options: Parameters<typeof trpc.github.getReposForScrollingWithUser.useQuery>[1] = {}
) => {
  const auth = useAuth();

  const query = trpc.github.getReposForScrollingWithUser.useQuery(
    { limit },
    {
      enabled: !auth.isLoading && auth.isSignedIn,
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.data?.code === 'UNAUTHORIZED') {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes for user repos
      refetchOnWindowFocus: false,
      ...options,
    }
  );

  return {
    ...query,
    data: query.data as RepoSummary[] | undefined,
  };
}; 