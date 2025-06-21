'use client';

import { POPULAR_REPOS } from '@/lib/constants';
import { useReposForScrolling } from '@/lib/hooks/useRepoData';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RepoSummary } from '@/lib/github/types';
import { useMemo } from 'react';

const NUM_ROWS = 8;
const ITEMS_PER_ROW = 8;
const pastelColors = [
  '#FFD1D1', '#FFEACC', '#FEFFD8', '#E2FFDB', '#D4F9FF', '#D0E2FF', '#DDD9FF', '#FFE3FF'
];

type RepoData = Partial<RepoSummary> & { owner: string; name: string, stars?: string | number };

const RepoItem = ({ repo, color, isSkeleton }: { repo: RepoData; color: string, isSkeleton?: boolean }) => {
  const router = useRouter();
  
  const owner = repo.owner;
  const name = repo.name;
  const stars = repo.stargazersCount?.toString() ?? repo.stars?.toString() ?? '0';

  return (
    <div className="inline-flex items-center mx-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-sm px-4 py-2 rounded-lg relative overflow-hidden"
        style={{ backgroundColor: color }}
      >
        {isSkeleton && (
           <div 
             className="absolute inset-0 animate-shimmer"
             style={{
                backgroundImage: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
             }}
           />
        )}
        <div 
          className="flex items-center space-x-2"
          style={{ visibility: isSkeleton ? 'hidden' : 'visible' }}
        >
          <span className="font-mono text-gray-950 font-medium">{owner}/</span>
          <span className="font-mono font-bold text-gray-950">{name}</span>
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

        {!isSkeleton && (
          <motion.button
            onClick={() => router.push(`/${owner}/${name}`)}
            className="absolute inset-0 cursor-pointer"
            aria-label={`View ${owner}/${name} repository`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          />
        )}
      </motion.div>
    </div>
  );
};

export const ScrollingRepos = ({ className }: { className?: string }) => {
  const { data: fetchedRepos, isLoading } = useReposForScrolling(NUM_ROWS * ITEMS_PER_ROW);

  const reposToDisplay = useMemo(() => {
    const initialRepos: RepoData[] = POPULAR_REPOS.slice(0, NUM_ROWS * ITEMS_PER_ROW);
    
    if (!fetchedRepos) {
      return initialRepos;
    }

    const fetchedMap = new Map(fetchedRepos.map(r => [`${r.owner}/${r.name}`, r]));
    
    return initialRepos.map(initialRepo => {
      const key = `${initialRepo.owner}/${initialRepo.name}`;
      return fetchedMap.has(key) ? fetchedMap.get(key)! : initialRepo;
    });

  }, [fetchedRepos]);
  
  const rows = Array.from({ length: NUM_ROWS }, (_, i) => 
    reposToDisplay.slice(i * ITEMS_PER_ROW, (i + 1) * ITEMS_PER_ROW)
  );

  return (
    <div 
      className={cn("absolute inset-0 w-full overflow-hidden select-none", className)} 
      aria-hidden="true"
    >
      {rows.map((row, idx) => (
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
          {[...row, ...row].map((repo, repoIdx) => {
            const color = pastelColors[(idx * ITEMS_PER_ROW + (repoIdx % ITEMS_PER_ROW)) % pastelColors.length];
            const isSkeleton = !repo.stargazersCount;
            return <RepoItem key={`${repo.owner}-${repo.name}-${repoIdx}`} repo={repo} color={color} isSkeleton={isSkeleton} />;
          })}
        </motion.div>
      ))}

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
  );
}; 