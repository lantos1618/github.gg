'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';

interface StarCountProps {
  owner: string;
  repo: string;
  className?: string;
}

export function StarCount({ owner, repo, className = '' }: StarCountProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isSignedIn } = useAuth();

  const { data: repoInfo, isLoading, error } = trpc.github.getRepoInfo.useQuery(
    { owner, repo },
    {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  const { data: starredData } = trpc.github.hasStarredRepo.useQuery(
    { owner, repo },
    {
      enabled: isSignedIn,
      staleTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const hasStarred = starredData?.hasStarred || false;

  const handleClick = () => {
    window.open(`https://github.com/${owner}/${repo}`, '_blank');
  };

  const starCountDisplay = isLoading
    ? '---'
    : error
    ? 'N/A'
    : (repoInfo?.stargazersCount ?? 0).toLocaleString();

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="nav-star-count-btn"
      className={`inline-flex items-center gap-1.5 px-1 sm:px-2 py-1 transition-colors cursor-pointer ${className}`}
    >
      <Star
        size={16}
        stroke={isHovered || hasStarred ? '#f59e0b' : '#aaa'}
        fill={isHovered || hasStarred ? '#f59e0b' : 'none'}
        strokeWidth={2}
        className="transition-all duration-300"
      />
      <span className={`text-[13px] font-semibold ${isLoading ? 'text-[#ccc]' : 'text-[#111]'}`}>
        {starCountDisplay}
      </span>
    </button>
  );
}
