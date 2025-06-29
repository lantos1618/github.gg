'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { RepoSummary } from '../github/types';
import { useRepoStore } from '@/lib/store';

export interface RepoParams {
  user: string;
  repo: string;
  ref?: string;
  path?: string;
}

function getRepoId({ user, repo, ref, path }: RepoParams) {
  return [user, repo, ref || 'main', path || ''].filter(Boolean).join('/');
}

export function useRepoData(overrideParams?: RepoParams) {
  // Next.js Params expects an index signature, so cast to any for flexibility
  const { user, repo, ref, path } = useParams<{ user: string; repo: string; ref?: string; path?: string }>();
  const params = overrideParams ?? { user, repo, ref, path };
  const repoId = getRepoId(params);
  const setRepoFiles = useRepoStore(state => state.setRepoFiles);
  const store = useRepoStore();

  const { data, isLoading, error } = trpc.github.files.useQuery({
    owner: params.user,
    repo: params.repo,
    ref: params.ref,
    path: params.path,
  });

  useEffect(() => {
    if (data) {
      const repoFiles = data.files
        .filter((file): file is { name: string; path: string; content: string; size: number; type: 'file' | 'directory' } => 
          file.type === 'file' && typeof file.content === 'string'
        )
        .map((file) => ({
          path: file.path,
          content: file.content,
          size: file.size,
        }));
      setRepoFiles(repoId, repoFiles, data.totalFiles);
    }
  }, [data, repoId, setRepoFiles]);

  const repoData = store.repos[repoId] || { files: [], totalFiles: 0 };

  return {
    params,
    isLoading,
    error,
    files: repoData.files,
    totalFiles: repoData.totalFiles,
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
      retry: false, // No retries for cached data
      staleTime: 0, // Always fresh since it's just cached data
      refetchOnWindowFocus: false,
      ...options,
    }
  );

  return {
    ...query,
    data: query.data as RepoSummary[] | undefined,
  };
};

export const useCacheStatus = () => {
  const auth = useAuth();

  return trpc.github.checkCacheStatus.useQuery(undefined, {
    enabled: !auth.isLoading,
    staleTime: 30 * 1000, // Check every 30 seconds
    refetchOnWindowFocus: false,
  });
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

export const useUserRepoNames = () => {
  const auth = useAuth();
  return trpc.github.getUserRepoNames.useQuery(undefined, {
    enabled: !auth.isLoading && auth.isSignedIn,
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes
    refetchOnWindowFocus: false,
  });
};

export const useSponsorRepos = () => {
  const auth = useAuth();
  return trpc.github.getSponsorRepos.useQuery(undefined, {
    enabled: !auth.isLoading,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
    refetchOnWindowFocus: false,
  });
};

export const useInstallationRepositories = (
  limit: number = 20,
  options: Parameters<typeof trpc.github.getInstallationRepositories.useQuery>[1] = {}
) => {
  const auth = useAuth();
  return trpc.github.getInstallationRepositories.useQuery(
    { limit },
    {
      enabled: !auth.isLoading && auth.isSignedIn,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      ...options,
    }
  );
}; 