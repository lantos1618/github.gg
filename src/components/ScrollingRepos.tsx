'use client';

import { useReposForScrolling } from '@/lib/hooks/useRepoData';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatStars, shuffleArray } from '@/lib/utils';
import { RepoSummary } from '@/lib/github/types';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { POPULAR_REPOS } from '@/lib/constants';
import chroma from 'chroma-js';

const CustomTooltipContent = React.forwardRef<
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

const NUM_ROWS = 10;
const ITEMS_PER_ROW = 8;
const TOTAL_REPOS = NUM_ROWS * ITEMS_PER_ROW;
const pastelColors = [
  '#FFD1D1', '#FFEACC', '#FEFFD8', '#E2FFDB', '#D4F9FF', '#D0E2FF', '#DDD9FF', '#FFE3FF'
];

type RepoData = Partial<RepoSummary> & { 
  owner: string; 
  name: string; 
  stars?: string | number; 
  special?: boolean;
  isUserRepo?: boolean;
  isPlaceholder?: boolean;
  stargazersCount?: number | string;
};

const RepoItem = ({ repo, color, isSkeleton }: { repo: RepoData; color: string, isSkeleton?: boolean }) => {
  const router = useRouter();
  const owner = repo.owner;
  const name = repo.name;
  const stars = repo.stargazersCount ? formatStars(repo.stargazersCount) : '0';
  const description = repo.description || 'No description available.';
  const isSpecial = repo.special;
  const isUserRepo = repo.isUserRepo;
  const isPlaceholder = repo.isPlaceholder;

  const { lightColor, darkColor } = useMemo(() => {
    const light = color;
    const dark = chroma(color).darken(1.4).saturate(0.5).hex();
    return { lightColor: light, darkColor: dark };
  }, [color]);

  const handleClick = useCallback(() => {
    router.push(`/${owner}/${name}`);
  }, [router, owner, name]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center mx-4">
          <motion.div
            className={cn(
              "text-sm px-4 py-2 rounded-lg relative flex items-center justify-center",
              isSpecial && "special-repo-shimmer",
              isUserRepo && "ring-2 ring-blue-500 ring-opacity-50"
            )}
            style={{ 
              backgroundColor: lightColor,
              color: darkColor,
              minWidth: '220px', 
              minHeight: '40px',
            }}
            whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400, damping: 17 } }}
          >
            {isSpecial && (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="absolute -top-2 -left-2 text-amber-500 transform -rotate-20">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
              </svg>
            )}
            {isUserRepo && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="absolute -top-1 -right-1 text-blue-500">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
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
        <CustomTooltipContent backgroundColor={darkColor} textColor={lightColor}>
          <p className="max-w-xs">
            {isPlaceholder 
              ? "Popular repository - loading details..." 
              : description
            }
          </p>
        </CustomTooltipContent>
      )}
    </Tooltip>
  );
};
RepoItem.displayName = 'RepoItem';

export const ScrollingRepos = ({ className }: { className?: string }) => {
  const { data: streamingRepos, isLoading } = useReposForScrolling(TOTAL_REPOS);
  
  // Initialize with popular repos immediately
  const [repos, setRepos] = useState<RepoData[]>(() => {
    return POPULAR_REPOS.slice(0, TOTAL_REPOS).map(repo => ({
      ...repo,
      stargazersCount: 1200,
      description: "Popular repository",
      isPlaceholder: true,
      special: repo.special
    }));
  });

  // Update repos as streaming data arrives
  useEffect(() => {
    if (streamingRepos && streamingRepos.length > 0) {
      setRepos(prev => {
        const newRepos = [...prev];
        
        // Find user repos that aren't already in the grid
        streamingRepos.forEach(streamingRepo => {
          const isUserRepo = (streamingRepo as any).isUserRepo;
          if (isUserRepo) {
            const exists = newRepos.some(repo => 
              repo.owner === streamingRepo.owner && repo.name === streamingRepo.name
            );
            
            if (!exists) {
              // Insert user repo at random position
              const randomIndex = Math.floor(Math.random() * newRepos.length);
              newRepos.splice(randomIndex, 0, { ...streamingRepo, isUserRepo: true });
              // Remove last repo to maintain grid size
              newRepos.pop();
            }
          }
        });
        
        return newRepos;
      });
    }
  }, [streamingRepos]);

  // Distribute repos across rows for circular scrolling
  const rows = useMemo(() => {
    return Array.from({ length: NUM_ROWS }, (_, i) => 
      repos.slice(i * ITEMS_PER_ROW, (i + 1) * ITEMS_PER_ROW)
    );
  }, [repos]);

  // Memoize row colors - create stable color assignments
  const rowColors = useMemo(() => {
    return Array.from({ length: NUM_ROWS }, (_, rowIndex) => {
      // Use a deterministic shuffle based on row index
      const shuffled = [...pastelColors];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = (rowIndex * 7 + i) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  return (
    <TooltipProvider>
      <div 
        className={cn("absolute inset-0 w-full overflow-hidden select-none", className)} 
        aria-hidden="true"
      >
        {rows.map((row, idx) => {
          const colorsForRow = rowColors[idx];
          
          return (
            <motion.div
              key={`row-${idx}`}
              className="flex whitespace-nowrap py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              style={{
                animation: `scroll${idx % 2 === 0 ? 'Left' : 'Right'} 180s linear infinite`,
              }}
            >
              {/* Duplicate row for seamless scrolling */}
              {Array.from({ length: 2 }).flatMap((_, duplicateIndex) =>
                row.map((repo, repoIdx) => {
                  const color = colorsForRow[repoIdx % colorsForRow.length];
                  const key = `${idx}-${repo.owner}-${repo.name}-${repoIdx}-${duplicateIndex}`;
                  
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.8, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400,
                        delay: repo.isUserRepo ? 0.2 : 0 
                      }}
                    >
                      <RepoItem 
                        repo={repo} 
                        color={color} 
                        isSkeleton={isLoading && repo.isPlaceholder} 
                      />
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          );
        })}

        <style jsx global>{`
          @keyframes scrollLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes scrollRight {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
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

          /* High contrast mode support */
          @media (forced-colors: active) {
            button {
              border: 2px solid transparent;
            }
            button:focus-visible {
              outline: 2px solid CanvasText;
              outline-offset: 2px;
            }
          }

          /* Focus styles */
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