'use client';

import { useReposForScrolling, useSponsorRepos, useUserReposForScrolling, useInstallationRepositories } from '@/lib/hooks/useRepoData';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn, formatStars, shuffleArray } from '@/lib/utils';
import { RepoSummary } from '@/lib/github/types';
import { useMemo, useCallback, forwardRef, useEffect, useState, useRef } from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import chroma from 'chroma-js';
import { useAuth } from '@/lib/auth/client';

const CustomTooltipContent = forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { 
    backgroundColor: string;
    textColor: string;
  }
>(({ backgroundColor, textColor, className, sideOffset = 4, ...props }, ref) => {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm",
          className
        )}
        style={{ backgroundColor: backgroundColor, color: textColor, border: 'none' }}
        {...props}
      >
        {props.children}
        <TooltipPrimitive.Arrow style={{ fill: backgroundColor }} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
});
CustomTooltipContent.displayName = 'CustomTooltipContent';

const pastelColors = [
  '#FFD1D1', '#FFEACC', '#FEFFD8', '#E2FFDB', '#D4F9FF', '#D0E2FF', '#DDD9FF', '#FFE3FF'
];

type RepoData = Partial<RepoSummary> & { 
  owner: string; 
  name: string; 
  stars?: string | number; 
  special?: boolean;
  isUserRepo?: boolean;
  isSponsor?: boolean;
  isPlaceholder?: boolean;
  stargazersCount?: number | string;
};

const RepoItem = ({ repo, color, isSkeleton }: { repo: RepoData; color: string, isSkeleton?: boolean }) => {
  const router = useRouter();
  const { owner, name, description, special, isUserRepo, isSponsor } = repo;
  const stars = repo.stargazersCount ? formatStars(repo.stargazersCount) : '0';

  const { ultraLightColor, lightColor, darkColor } = useMemo(() => {
    const baseColor = chroma(color);
    return {
      ultraLightColor: baseColor.brighten(0.8).hex(),
      lightColor: baseColor.brighten(0.2).hex(),
      darkColor: baseColor.darken(1.5).saturate(0.8).hex(),
    };
  }, [color]);

  const handleClick = useCallback(() => {
    router.push(`/${owner}/${name}`);
  }, [router, owner, name]);

  const style = useMemo(() => {
    const size = isSponsor
      ? { minWidth: '220px', minHeight: '64px' }
      : { minWidth: '220px', minHeight: '40px' };
      
    const border = isSponsor
      ? { borderColor: 'black' }
      : isUserRepo
      ? { borderColor: darkColor }
      : { borderColor: 'transparent' };

    return {
      backgroundColor: lightColor,
      color: darkColor,
      ...size,
      ...border,
    };
  }, [isSponsor, isUserRepo, darkColor, lightColor]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center mx-4">
          <motion.div
            className={cn(
              "text-sm px-4 py-2 rounded-lg relative flex items-center justify-center border-2",
              special && "special-repo-shimmer",
            )}
            style={style}
            whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400, damping: 17 } }}
          >
            {isSponsor && (
              <div className="absolute -top-px -right-px bg-black text-white text-xs font-bold px-2 py-0.5 rounded-bl-md rounded-tr-lg">
                Sponsor
              </div>
            )}
            <div className="flex items-center justify-center text-center space-x-2">
              <span className="font-mono">
                <span className="font-medium">{owner}/</span>
                <span className="font-bold">{name}</span>
              </span>
              <div className="flex items-center text-xs">
                <svg 
                  className="w-3 h-3 mr-0.5" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
                </svg>
                {stars}
              </div>
            </div>
            {!isSkeleton && (
              <button
                onClick={handleClick}
                className="absolute inset-0 cursor-pointer"
                aria-label={`View ${owner}/${name} repository`}
              />
            )}
          </motion.div>
        </div>
      </TooltipTrigger>
      {!isSkeleton && (
        <CustomTooltipContent backgroundColor={darkColor} textColor={ultraLightColor}>
          <p className="max-w-xs">
            {repo.isPlaceholder 
              ? "Loading repository details..." 
              : description || "No description available."
            }
          </p>
        </CustomTooltipContent>
      )}
    </Tooltip>
  );
};
RepoItem.displayName = 'RepoItem';

// Responsive row count hook
function useResponsiveRows() {
  const [rows, setRows] = useState(10);
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 640) setRows(9);
      else if (window.innerWidth <= 1024) setRows(9);
      else setRows(9);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return rows;
}

export const ScrollingRepos = ({ className, children }: { className?: string, children?: React.ReactNode }) => {
  const { data: popularReposRaw } = useReposForScrolling(80);
  const { data: sponsorReposRaw } = useSponsorRepos();
  const { data: userReposRaw } = useUserReposForScrolling(10);
  const { data: installationReposRaw } = useInstallationRepositories(10);
  const auth = useAuth();
  
  const responsiveRows = useResponsiveRows();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  // NEW: State for shuffled repos
  const [shuffledRows, setShuffledRows] = useState<RepoData[][] | null>(null);

  const [justifyClass, setJustifyClass] = useState('justify-start');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth > 1024) {
        setJustifyClass('justify-center');
      } else {
        setJustifyClass('justify-start');
      }
    }
  }, []);

  // For row refs
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const sponsors = sponsorReposRaw || [];
    const popular = popularReposRaw || [];
    const userRepos = userReposRaw || [];
    const installationRepos = (installationReposRaw as Array<{ owner: string; name: string; repositoryId: number }>) || [];
    const allRepos: RepoData[] = [];
    const loggedIn = auth.isSignedIn;
    let userSpecific: RepoData[] = [];
    if (loggedIn) {
      if (userRepos.length > 0) {
        userSpecific = userRepos;
      } else if (installationRepos.length > 0) {
        userSpecific = installationRepos.map((r: { owner: string; name: string; repositoryId: number }) => ({
          owner: r.owner,
          name: r.name,
          stargazersCount: 0,
          forksCount: 0,
          description: '',
          isUserRepo: true,
        }));
      }
    }
    // 1. Add Sponsors (2 rows)
    allRepos.push(...shuffleArray(sponsors).slice(0, 16));
    // 2. Add User's Repos (if logged in, 2 rows)
    if (loggedIn) {
      allRepos.push(...shuffleArray(userSpecific).slice(0, 16));
    }
    // 3. Fill with Popular Repos
    const excludedRepos = new Set(allRepos.map(r => `${r.owner}/${r.name}`));
    const remainingPopular = popular.filter(p => !excludedRepos.has(`${p.owner}/${p.name}`));
    allRepos.push(...shuffleArray(remainingPopular));
    // Mark repo types
    const finalRepos = allRepos.map(repo => {
      const isSponsor = sponsors.some(s => s.owner === repo.owner && s.name === repo.name);
      const isUserRepo = userSpecific.some(u => u.owner === repo.owner && u.name === repo.name);
      return {
        ...repo,
        isSponsor,
        isUserRepo,
      };
    }).slice(0, 80);
    // Distribute into rows (responsive)
    const rows = Array.from({ length: responsiveRows }, (_, i) => finalRepos.slice(i * 8, (i + 1) * 8));
    setShuffledRows(rows);
  }, [popularReposRaw, sponsorReposRaw, userReposRaw, installationReposRaw, auth.isSignedIn, responsiveRows]);

  const isLoading = false;

  // Dynamically compute container height so rows are not clipped
  useEffect(() => {
    const GAP_PX = 16; // matches space-y-4
    const DEFAULT_ROW_HEIGHT = 56; // reasonable average between 40 and 64
    const MIN_HEIGHT = 520; // keep the hero area at least this tall

    function measureAndSetHeight() {
      const heights = rowRefs.current
        .slice(0, shuffledRows ? shuffledRows.length : 0)
        .map((el) => (el?.offsetHeight ? el.offsetHeight : DEFAULT_ROW_HEIGHT));
      const rows = heights.length;
      if (rows === 0) {
        setContainerHeight(MIN_HEIGHT);
        return;
      }
      const total = heights.reduce((a, b) => a + b, 0) + GAP_PX * Math.max(0, rows - 1);
      setContainerHeight(Math.max(MIN_HEIGHT, total));
    }

    // measure after layout
    const raf = requestAnimationFrame(measureAndSetHeight);
    window.addEventListener('resize', measureAndSetHeight);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measureAndSetHeight);
    };
  }, [shuffledRows]);

  // Memoize row colors - create stable color assignments
  const rowColors = useMemo(() => {
    return Array.from({ length: responsiveRows }, (_, rowIndex) => {
      const shuffled = [...pastelColors];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = (rowIndex * 7 + i) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, [responsiveRows]);

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          `w-full overflow-hidden select-none relative`,
          className
        )}
        aria-hidden="true"
        style={{ height: `${containerHeight}px` }}
      >
        {/* Overlay hero content in the center for large screens */}
        {typeof window !== 'undefined' && window.innerWidth > 1024 && children && (
          <div className="absolute z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            {children}
          </div>
        )}

        {/* Scrolling rows with snake pattern (alternating directions) */}
        {shuffledRows && (
          <div className="space-y-4">
            {shuffledRows.map((row, rowIndex) => {
              const colors = rowColors[rowIndex] || pastelColors;
              // Top row goes right (reading direction), then alternates
              const direction = rowIndex % 2 === 0 ? 'right' : 'left';
              const duration = 80; // keep a consistent speed for all rows
              const delaySeconds = `-${(rowIndex % 12) * 3}s`; // staggered starting offsets

              // Skip empty rows
              if (!row || row.length === 0) return null;

              return (
                <div
                  key={rowIndex}
                  ref={(el) => { rowRefs.current[rowIndex] = el; }}
                  className={cn(
                    "flex items-center gap-2 sm:gap-4",
                    justifyClass
                  )}
                  style={{
                    width: 'fit-content',
                    willChange: 'transform',
                    animation: `scroll${direction === 'left' ? 'Left' : 'Right'} ${duration}s linear infinite`,
                    animationDelay: delaySeconds,
                  }}
                >
                  {/* Duplicate row content 3 times for seamless loop */}
                  {[...row, ...row, ...row].map((repo, repoIndex) => {
                    const colorIndex = repoIndex % colors.length;
                    return (
                      <motion.div
                        key={`${repo.owner}-${repo.name}-${repoIndex}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          delay: Math.min(repoIndex * 0.03, 0.6)
                        }}
                      >
                        <RepoItem
                          repo={repo}
                          color={colors[colorIndex]}
                          isSkeleton={isLoading && repo.isPlaceholder}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        <style jsx global>{`

          @keyframes scrollLeft {
            0% { transform: translateX(-33.333%); }
            100% { transform: translateX(-66.666%); }
          }
          @keyframes scrollRight {
            0% { transform: translateX(-66.666%); }
            100% { transform: translateX(-33.333%); }
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .animate-shimmer {
            animation: shimmer 1.5s infinite;
          }
          .special-repo-shimmer::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: linear-gradient(
              100deg,
              rgba(255, 255, 255, 0) 20%,
              rgba(255, 255, 255, 0.4) 50%,
              rgba(255, 255, 255, 0) 80%
            );
            background-size: 200% 100%;
            animation: shimmer 2s infinite;
            pointer-events: none;
            border-radius: inherit;
          }
          @media (prefers-reduced-motion: reduce) {
            .flex {
              animation: none !important;
              transform: none !important;
            }
            button {
              transform: none !important;
              transition: none !important;
            }
          }
          @media (forced-colors: active) {
            button {
              border: 2px solid transparent;
            }
            button:focus-visible {
              outline: 2px solid CanvasText;
              outline-offset: 2px;
            }
          }
          button:focus-visible {
            outline: 2px solid rgb(17, 24, 39);
            outline-offset: 2px;
            border-radius: 8px;
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}; 