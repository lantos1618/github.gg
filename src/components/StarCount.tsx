'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
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
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  const { data: starredData } = trpc.github.hasStarredRepo.useQuery(
    { owner, repo },
    {
      enabled: isSignedIn,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
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

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center gap-2 px-1 sm:px-2 py-1 transition-all duration-300 text-black ${className}`}
      style={{ background: 'none', border: 'none', borderRadius: '9999px', cursor: 'pointer' }}
    >
      {/* Star Icon with rounded corners, spins and fills gold on hover or when starred */}
      <span className="relative flex items-center justify-center">
        <motion.span
          animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          style={{ display: 'block' }}
        >
          <Star
            size={24}
            stroke={isHovered || hasStarred ? '#f59e0b' : '#111'}
            fill={isHovered || hasStarred ? '#f59e0b' : 'none'}
            strokeWidth={2}
            className="star-svg transition-all duration-300"
          />
        </motion.span>
        {/* Enhanced burst animation with multiple dots */}
        {burst && (
          <span className="absolute inset-0 pointer-events-none">
            {(() => {
              const dotCount = 5;
              return [...Array(dotCount)].map((_, i) => {
                const angle = (360 / dotCount) * i;
                return (
                  <span
                    key={i}
                    className={`burst-dot burst-dot-${i}`}
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
              });
            })()}
          </span>
        )}
      </span>
      <span className="font-semibold hidden sm:inline">Stargazers</span>
      <span className="px-2 py-0.5 rounded-full text-base font-semibold w-16 text-center flex items-center justify-center">
        {isLoading ? (
          <Spinner size={14} />
        ) : error ? (
          'N/A'
        ) : (
          (repoInfo?.stargazersCount ?? 0).toLocaleString()
        )}
      </span>
      <style jsx>{`
        .star-svg {
          stroke: #111;
          fill: none;
        }
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
