'use client';

import { useReposForScrolling, useUserReposForScrolling, useCacheStatus, useUserRepoNames } from '@/lib/hooks/useRepoData';
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
import { useAuth } from '@/lib/hooks/useAuth';

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

  const { ultraLightColor, lightColor, darkColor } = useMemo(() => {
    const ultraLightColor = chroma(color).brighten(.8).hex();
    const lightColor = chroma(color).brighten(.2).hex();
    const darkColor = chroma(color).darken(1.5).saturate(0.8).hex();
    return { ultraLightColor, lightColor, darkColor };
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="absolute -top-3 -left-3 text-amber-400 transform -rotate-40">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
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
        <CustomTooltipContent backgroundColor={darkColor} textColor={ultraLightColor}>
          <p className="max-w-xs">
            {isPlaceholder 
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

export const ScrollingRepos = ({ className }: { className?: string }) => {
  const { data: cachedRepos, isLoading: isCachedLoading } = useReposForScrolling(TOTAL_REPOS);
  const { data: userRepos } = useUserReposForScrolling(10);
  const { data: cacheStatus } = useCacheStatus();
  const { data: userRepoNames } = useUserRepoNames();
  const auth = useAuth();
  
  const [repos, setRepos] = useState<RepoData[]>([]);
  const userRepoIds = useMemo(() => new Set(userRepoNames || []), [userRepoNames]);

  // Set initial repos from cache and update when user repos are identified
  useEffect(() => {
    if (cachedRepos) {
      setRepos(cachedRepos.map(repo => {
        const repoKey = `${repo.owner}/${repo.name}`;
        return {
          ...repo,
          isUserRepo: userRepoIds.has(repoKey),
          isPlaceholder: !repo.description,
        };
      }));
    }
  }, [cachedRepos, userRepoIds]);

  // Smoothly insert or update user repos with fresh data
  useEffect(() => {
    if (userRepos && userRepos.length > 0) {
      setRepos(prevRepos => {
        const newRepos = [...prevRepos];
        let hasChanges = false;
        
        userRepos.forEach(userRepo => {
          const repoKey = `${userRepo.owner}/${userRepo.name}`;
          const existingIndex = newRepos.findIndex(r => `${r.owner}/${r.name}` === repoKey);
          
          if (existingIndex !== -1) {
            // Update existing repo with fresher data, ensuring it's marked as a user repo
            newRepos[existingIndex] = { 
              ...newRepos[existingIndex],
              ...userRepo,
              isUserRepo: true 
            };
            hasChanges = true;
          } else {
            // Insert new user repo at a random position
            const randomIndex = Math.floor(Math.random() * newRepos.length);
            newRepos.splice(randomIndex, 0, { ...userRepo, isUserRepo: true });
            newRepos.pop(); // Maintain grid size
            hasChanges = true;
          }
        });
        
        return hasChanges ? newRepos : prevRepos;
      });
    }
  }, [userRepos]);

  // Background cache refresh if needed
  useEffect(() => {
    if (cacheStatus?.needsRefresh && auth.isSignedIn) {
      // This is where a mutation to refresh the cache would be called
      console.log('Cache needs refresh, triggering background update...');
    }
  }, [cacheStatus?.needsRefresh, auth.isSignedIn]);

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
                  
                  return (
                    <motion.div
                      key={`${idx}-${repo.owner}-${repo.name}-${repoIdx}-${duplicateIndex}-${repo.isUserRepo ? 'user' : 'cached'}`}
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
                        isSkeleton={isCachedLoading && repo.isPlaceholder} 
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