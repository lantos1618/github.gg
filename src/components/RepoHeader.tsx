'use client';

import { LoadingWave, AnimatedTick } from './LoadingWave';

interface RepoHeaderProps {
  user: string;
  repo: string;
  onCopyAll: () => void;
  isCopying: boolean;
  copied: boolean;
  fileCount?: number;
}

export function RepoHeader({ 
  user, 
  repo, 
  onCopyAll, 
  isCopying, 
  copied, 
  fileCount 
}: RepoHeaderProps) {
  const githubUrl = `https://github.com/${user}/${repo}`;

  return (
    <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <a 
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group cursor-pointer"
        >
          <h1 className="text-3xl font-bold text-gray-800 group-hover:text-gray-600 transition-colors">
            {user}/{repo}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {fileCount !== undefined && (
              <p className="text-sm text-gray-600">
                {fileCount} file{fileCount !== 1 ? 's' : ''}
              </p>
            )}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </a>
      </div>
      <button
        onClick={onCopyAll}
        disabled={isCopying}
        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
        <span>
          {isCopying ? 'Copying' : copied ? 'Copied!' : 'Copy All Content'}
        </span>
        {isCopying && <LoadingWave size="sm" color="white" />}
        {copied && <AnimatedTick size="sm" color="#10b981" />}
      </button>
    </div>
  );
} 