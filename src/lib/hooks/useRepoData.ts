'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useRepoStore } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';

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
  }, [data, store.setFiles]);

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

export const useReposForScrolling = (limit: number = 64) => {
  return trpc.github.getReposForScrolling.useQuery({ limit });
}; 