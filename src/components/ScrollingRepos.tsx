'use client';

import { popularRepos } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const NUM_ROWS = 2;
const ITEMS_PER_ROW = 3;

export const ScrollingRepos = () => {
  const router = useRouter();
  
  // We need NUM_ROWS * ITEMS_PER_ROW repos.
  const reposToDisplay = popularRepos.slice(0, NUM_ROWS * ITEMS_PER_ROW);
  
  const rows = Array.from({ length: NUM_ROWS }, (_, i) => 
    reposToDisplay.slice(i * ITEMS_PER_ROW, (i + 1) * ITEMS_PER_ROW)
  );

  return (
    <div 
      className="absolute inset-0 w-full overflow-hidden select-none bg-gray-200" 
      aria-hidden="true"
    >
      {rows.map((row, idx) => (
        <motion.div
          key={idx}
          className="flex whitespace-nowrap py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 1.5 }}
          style={{
            animation: `scroll${idx % 2 === 0 ? 'Left' : 'Right'} 90s linear infinite`,
          }}
        >
          {/* Duplicate the row to create seamless loop */}
          {[...row, ...row].map((repo, repoIdx) => (
            <motion.button
              key={`${repo.name}-${repoIdx}`}
              onClick={() => router.push(`/${repo.owner}/${repo.name}`)}
              className="inline-flex items-center mx-12 group cursor-pointer focus-visible:outline-none"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              aria-label={`View ${repo.owner}/${repo.name} repository`}
              tabIndex={-1}
            >
              <motion.div 
                className="text-sm bg-gray-900/20 px-6 py-3 rounded-lg border border-transparent"
                whileHover={{ 
                  backgroundColor: "rgba(17, 24, 39, 0.25)",
                  borderColor: "rgba(17, 24, 39, 0.5)"
                }}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-gray-950 font-medium">{repo.owner}/</span>
                  <span className="font-mono font-bold text-gray-950">{repo.name}</span>
                  <div className="flex items-center text-xs text-gray-950">
                    <svg 
                      className="w-3 h-3 mr-0.5" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
                    </svg>
                    {repo.stars}
                  </div>
                </div>
              </motion.div>
            </motion.button>
          ))}
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