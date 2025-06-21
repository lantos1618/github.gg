'use client';

import { POPULAR_REPOS } from '@/lib/constants';
import { useReposForScrolling } from '@/lib/hooks/useRepoData';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatStars, shuffleArray, darkenColor } from '@/lib/utils';
import { RepoSummary } from '@/lib/github/types';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const CustomTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { color: string }
>(({ color, className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm text-white animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      style={{ backgroundColor: color, border: 'none' }}
      {...props}
    >
      {props.children}
      <TooltipPrimitive.Arrow style={{ fill: color }} />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
CustomTooltipContent.displayName = 'CustomTooltipContent';

const NUM_ROWS = 8;
const ITEMS_PER_ROW = 8;
const SCROLL_FACTOR = 2; // Creates a longer, seamless row for scrolling
const pastelColors = [
  '#FFD1D1', '#FFEACC', '#FEFFD8', '#E2FFDB', '#D4F9FF', '#D0E2FF', '#DDD9FF', '#FFE3FF'
];

type RepoData = Partial<RepoSummary> & { owner: string; name: string, stars?: string | number };

const RepoItem = ({ repo, color, isSkeleton }: { repo: RepoData; color: string, isSkeleton?: boolean }) => {
  const router = useRouter();
  
  const owner = repo.owner;
  const name = repo.name;
  const stars = repo.stargazersCount ? formatStars(repo.stargazersCount) : '0';
  const description = repo.description || 'No description available.';
  const tooltipColor = useMemo(() => darkenColor(color, 40), [color]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center mx-4">
          <motion.div
            className="text-sm px-4 py-2 rounded-lg relative flex items-center justify-center"
            style={{ 
              backgroundColor: color,
              minWidth: '220px', 
              minHeight: '40px',
            }}
            whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400, damping: 17 } }}
          >
            <AnimatePresence>
              {isSkeleton && (
                <motion.div
                  key="skeleton"
                  className="absolute inset-0"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.4 } }}
                >
                  <div 
                    className="w-full h-full animate-shimmer"
                    style={{
                      backgroundImage: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center justify-center text-center space-x-2">
              <span className="font-mono text-gray-950">
                <span className="font-medium">{owner}/</span>
                <span className="font-bold">{name}</span>
              </span>
              <div className="flex items-center text-xs text-gray-950">
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
            
            <AnimatePresence>
              {!isSkeleton && (
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    onClick={() => router.push(`/${owner}/${name}`)}
                    className="absolute inset-0 cursor-pointer"
                    aria-label={`View ${owner}/${name} repository`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </TooltipTrigger>
      {!isSkeleton && (
        <CustomTooltipContent color={tooltipColor}>
          <p className="max-w-xs">{description}</p>
        </CustomTooltipContent>
      )}
    </Tooltip>
  );
};

export const ScrollingRepos = ({ className }: { className?: string }) => {
  const { data: fetchedRepos, isLoading } = useReposForScrolling(NUM_ROWS * ITEMS_PER_ROW);

  const reposToDisplay = useMemo(() => {
    return (fetchedRepos && fetchedRepos.length > 0)
      ? fetchedRepos
      : POPULAR_REPOS.slice(0, NUM_ROWS * ITEMS_PER_ROW).map(r => ({ ...r, stargazersCount: 0 }));
  }, [fetchedRepos]);
  
  const rows = Array.from({ length: NUM_ROWS }, (_, i) => 
    reposToDisplay.slice(i * ITEMS_PER_ROW, (i + 1) * ITEMS_PER_ROW)
  );

  const rowColors = useMemo(() => {
    return Array.from({ length: NUM_ROWS }, () => shuffleArray(pastelColors));
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
              key={idx}
              className="flex whitespace-nowrap py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                animation: `scroll${idx % 2 === 0 ? 'Left' : 'Right'} 180s linear infinite`,
              }}
            >
              {Array.from({ length: SCROLL_FACTOR }).flatMap((_, i) =>
                row.map((repo, repoIdx) => {
                  const color = colorsForRow[repoIdx % colorsForRow.length];
                  const isSkeleton = !repo.stargazersCount;
                  const key = `${idx}-${repo.owner}-${repo.name}-${repoIdx}-${i}`;
                  return <RepoItem key={key} repo={repo} color={color} isSkeleton={isSkeleton} />;
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