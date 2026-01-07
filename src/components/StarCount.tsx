'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/factory';

interface StarCountProps {
  owner: string;
  repo: string;
  className?: string;
}

export function StarCount({ owner, repo, className = '' }: StarCountProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [burst, setBurst] = useState(false);
  const { isSignedIn } = useAuth();

  const { data: repoInfo, isLoading, error } = trpc.github.getRepoInfo.useQuery(
    { owner, repo },
    {
      staleTime: 1000 * 60 * 30, // 30 minutes - star count rarely changes
      gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  const { data: starredData } = trpc.github.hasStarredRepo.useQuery(
    { owner, repo },
    {
      enabled: isSignedIn,
      staleTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const hasStarred = starredData?.hasStarred || false;

  const handleClick = () => {
    setBurst(true);
    setTimeout(() => {
      setBurst(false);
      window.open(`https://github.com/${owner}/${repo}`, '_blank');
    }, 600);
  };

  // Format the star count or show placeholder
  const starCountDisplay = isLoading
    ? '---' // Placeholder that doesn't cause layout shift
    : error
    ? 'N/A'
    : (repoInfo?.stargazersCount ?? 0).toLocaleString();

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center gap-2 px-1 sm:px-2 py-1 transition-all duration-300 text-black ${className}`}
      style={{ background: 'none', border: 'none', borderRadius: '9999px', cursor: 'pointer' }}
    >
      {/* Star Icon - uses CSS transform for rotation instead of framer-motion */}
      <span className="relative flex items-center justify-center">
        <span
          className="block transition-transform duration-700 ease-out"
          style={{ transform: isHovered ? 'rotate(360deg)' : 'rotate(0deg)' }}
        >
          <Star
            size={24}
            stroke={isHovered || hasStarred ? '#f59e0b' : '#111'}
            fill={isHovered || hasStarred ? '#f59e0b' : 'none'}
            strokeWidth={2}
            className="transition-all duration-300"
          />
        </span>
        {/* Burst animation */}
        {burst && (
          <span className="absolute inset-0 pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (360 / 5) * i;
              return (
                <span
                  key={i}
                  className="burst-dot"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 4,
                    height: 4,
                    background: '#f59e0b',
                    borderRadius: '50%',
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-20px)`,
                    '--angle': `${angle}deg`
                  } as React.CSSProperties}
                />
              );
            })}
          </span>
        )}
      </span>
      <span className="font-semibold hidden sm:inline">Stargazers</span>
      <span className={`px-2 py-0.5 rounded-full text-base font-semibold w-16 text-center flex items-center justify-center ${isLoading ? 'text-gray-400' : ''}`}>
        {starCountDisplay}
      </span>
      <style jsx>{`
        .burst-dot {
          opacity: 1;
          animation: burst 0.5s forwards;
        }
        @keyframes burst {
          0% {
            opacity: 1;
            transform: scale(0.3) translate(-50%, -50%) rotate(var(--angle)) translateY(0);
          }
          60% {
            opacity: 1;
            transform: scale(1.2) translate(-50%, -50%) rotate(var(--angle)) translateY(-25px);
          }
          100% {
            opacity: 0;
            transform: scale(1) translate(-50%, -50%) rotate(var(--angle)) translateY(-35px);
          }
        }
      `}</style>
    </button>
  );
}
