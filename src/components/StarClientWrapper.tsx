'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useSessionHint } from '@/lib/session-context';
import type { ReactNode } from 'react';

interface StarClientWrapperProps {
  owner: string;
  repo: string;
  className?: string;
  children: ReactNode;
}

function cacheKey(userId: string, owner: string, repo: string) {
  return `gg-starred:${userId}:${owner}/${repo}`;
}

export function StarClientWrapper({ owner, repo, className = '', children }: StarClientWrapperProps) {
  const hint = useSessionHint();
  const [cachedStarred, setCachedStarred] = useState(false);

  useEffect(() => {
    if (!hint?.userId) {
      setCachedStarred(false);
      return;
    }
    try {
      setCachedStarred(localStorage.getItem(cacheKey(hint.userId, owner, repo)) === '1');
    } catch {
      setCachedStarred(false);
    }
  }, [hint?.userId, owner, repo]);

  const { data: starredData } = trpc.github.hasStarredRepo.useQuery(
    { owner, repo },
    {
      enabled: !!hint,
      staleTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!hint?.userId || starredData?.hasStarred !== true) return;
    try {
      localStorage.setItem(cacheKey(hint.userId, owner, repo), '1');
      setCachedStarred(true);
    } catch { /* localStorage unavailable */ }
  }, [hint?.userId, owner, repo, starredData?.hasStarred]);

  const hasStarred = starredData?.hasStarred === true || cachedStarred;

  return (
    <a
      href={`https://github.com/${owner}/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="nav-star-count-btn"
      className={`inline-flex items-center gap-1.5 px-1 sm:px-2 py-1 transition-colors group ${className}`}
    >
      <Star
        size={16}
        stroke={hasStarred ? '#f59e0b' : '#aaa'}
        fill={hasStarred ? '#f59e0b' : 'none'}
        strokeWidth={2}
        className={hasStarred ? '' : 'group-hover:stroke-[#f59e0b] group-hover:fill-[#f59e0b] transition-all duration-300'}
      />
      {children}
    </a>
  );
}
