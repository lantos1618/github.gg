'use client';

import { Star } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useSessionHint } from '@/lib/session-context';
import type { ReactNode } from 'react';

interface StarClientWrapperProps {
  owner: string;
  repo: string;
  className?: string;
  children: ReactNode;
}

export function StarClientWrapper({ owner, repo, className = '', children }: StarClientWrapperProps) {
  const hint = useSessionHint();

  const { data: starredData } = trpc.github.hasStarredRepo.useQuery(
    { owner, repo },
    {
      enabled: !!hint,
      staleTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const hasStarred = starredData?.hasStarred || false;

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
