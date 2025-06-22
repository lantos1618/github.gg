'use client';

import { useReposForScrolling } from '@/lib/hooks/useRepoData';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatStars, shuffleArray, darkenColor } from '@/lib/utils';
import { RepoSummary } from '@/lib/github/types';
import { useMemo, useCallback } from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const CustomTooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
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

type RepoData = Partial<RepoSummary> & { owner: string; name: string, stars?: string | number, special?: boolean };

const RepoItem = React.memo(({ repo, color, isSkeleton }: { repo: RepoData; color: string, isSkeleton?: boolean }) => {
  const router = useRouter();
  
  const owner = repo.owner;
  const name = repo.name;
  const stars = repo.stargazersCount ? formatStars(repo.stargazersCount) : '0';
  const description = repo.description || 'No description available.';
  const tooltipColor = useMemo(() => darkenColor(color, 40), [color]);
  const isSpecial = repo.special;

  // Memoize click handler to prevent unnecessary re-renders
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
              isSpecial && "special-repo-shimmer"
            )}
            style={{ 
              backgroundColor: color,
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
            
            {/* Single AnimatePresence to handle all state changes */}
            <AnimatePresence mode="wait">
              {isSkeleton ? (
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
              ) : (
                <motion.div
                  key="content"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    onClick={handleClick}
                    className="absolute inset-0 cursor-pointer"
                    aria-label={`View ${owner}/${name} repository`}
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
});
RepoItem.displayName = 'RepoItem';

export const ScrollingRepos = ({ className }: { className?: string }) => {
  const { data: reposToDisplay, isLoading } = useReposForScrolling(NUM_ROWS * ITEMS_PER_ROW);

  // Fix: Properly distribute repos across rows, handling cases where we have fewer than 64 repos
  const rows = useMemo(() => {
    const repos = reposToDisplay || [];
    const totalRepos = repos.length;
    
    // If we have fewer repos than needed, distribute them evenly
    if (totalRepos < NUM_ROWS * ITEMS_PER_ROW) {
      const reposPerRow = Math.ceil(totalRepos / NUM_ROWS);
      return Array.from({ length: NUM_ROWS }, (_, i) => {
        const startIndex = i * reposPerRow;
        const endIndex = Math.min(startIndex + reposPerRow, totalRepos);
        return repos.slice(startIndex, endIndex);
      });
    }
    
    // Normal case: exactly NUM_ROWS * ITEMS_PER_ROW repos
    return Array.from({ length: NUM_ROWS }, (_, i) => 
      repos.slice(i * ITEMS_PER_ROW, (i + 1) * ITEMS_PER_ROW)
    );
  }, [reposToDisplay]);

  // Memoize row colors to prevent unnecessary re-renders
  const rowColors = useMemo(() => {
    return Array.from({ length: NUM_ROWS }, () => shuffleArray(pastelColors));
  }, []);

  // Fix: Create duplicated rows properly, ensuring each row has enough items for seamless scrolling
  const duplicatedRows = useMemo(() => {
    return rows.map(row => {
      // If row is empty, return empty array
      if (row.length === 0) return [];
      
      // If row has fewer items than needed for seamless scrolling, repeat the items
      const itemsNeeded = ITEMS_PER_ROW * SCROLL_FACTOR;
      if (row.length >= itemsNeeded) {
        // We have enough items, just duplicate the entire row
        return Array.from({ length: SCROLL_FACTOR }).flatMap(() => row);
      } else {
        // We need to repeat items to fill the space
        const repeatedItems = [];
        for (let i = 0; i < itemsNeeded; i++) {
          repeatedItems.push(row[i % row.length]);
        }
        return repeatedItems;
      }
    });
  }, [rows]);

  return (
    <TooltipProvider>
      <div 
        className={cn("absolute inset-0 w-full overflow-hidden select-none", className)} 
        aria-hidden="true"
      >
        {rows.map((row, idx) => {
          const colorsForRow = rowColors[idx];
          const duplicatedRow = duplicatedRows[idx];
          
          // Skip rendering empty rows
          if (row.length === 0) {
            return (
              <motion.div
                key={`row-${idx}`}
                className="flex whitespace-nowrap py-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }} // Dimmed for empty rows
                transition={{ duration: 0.5, delay: isLoading ? 0.5 : 0 }}
              >
                <div className="text-gray-400 text-sm px-4">
                  Loading repositories...
                </div>
              </motion.div>
            );
          }
          
          return (
            <motion.div
              key={`row-${idx}`}
              className="flex whitespace-nowrap py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: isLoading ? 0.5 : 0 }}
              style={{
                animation: `scroll${idx % 2 === 0 ? 'Left' : 'Right'} 180s linear infinite`,
              }}
            >
              {duplicatedRow.map((repo, repoIdx) => {
                const color = colorsForRow[repoIdx % colorsForRow.length];
                const isSkeleton = isLoading || !repo.stargazersCount;
                // Simplified key that doesn't include loop index
                const key = `${idx}-${repo.owner}-${repo.name}-${repoIdx}`;
                return <RepoItem key={key} repo={repo} color={color} isSkeleton={isSkeleton} />;
              })}
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