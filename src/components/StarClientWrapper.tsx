'use client';

import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

/**
 * Clear all `gg-starred:*` localStorage entries.
 * Used on sign-out / userId change so the previous user's cached star state
 * doesn't leak across sessions (e.g. anonymous viewer seeing a gold star).
 */
function clearAllStarCache() {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gg-starred:')) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage unavailable */
  }
}

export function StarClientWrapper({ owner, repo, className = '', children }: StarClientWrapperProps) {
  const hint = useSessionHint();
  const [cachedStarred, setCachedStarred] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  // Invalidate cache when the active userId changes (sign-out, account switch).
  useEffect(() => {
    const currentUserId = hint?.userId ?? null;
    const prevUserId = prevUserIdRef.current;
    if (prevUserId !== null && prevUserId !== currentUserId) {
      clearAllStarCache();
    }
    prevUserIdRef.current = currentUserId;
  }, [hint?.userId]);

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
