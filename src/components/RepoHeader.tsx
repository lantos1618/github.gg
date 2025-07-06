'use client';

import { LoadingWave, AnimatedTick } from './LoadingWave';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

interface RepoHeaderProps {
  user: string;
  repo: string;
  refName?: string;
  onBranchChange?: (value: string) => void;
  onCopyAll: () => void;
  isCopying: boolean;
  copied: boolean;
  fileCount?: number;
}

export function RepoHeader({ 
  user, 
  repo, 
  refName,
  onBranchChange,
  onCopyAll, 
  isCopying, 
  copied, 
  fileCount
}: RepoHeaderProps) {
  const githubUrl = `https://github.com/${user}/${repo}`;

  const { data: branches = [], isLoading: loadingBranches, error: branchError } =
    trpc.github.getBranches.useQuery({ owner: user, repo });

  // Memoize the selected branch to ensure stability
  const selectedBranch = useMemo(() => {
    if (loadingBranches || branches.length === 0) return refName || 'main';
    
    // If the current refName is in the branches list, use it
    if (refName && branches.includes(refName)) {
      return refName;
    }
    
    // Otherwise, use the first branch (usually main or master)
    return branches[0];
  }, [refName, branches, loadingBranches]);


  const handleBranchChange = (value: string) => {
    onBranchChange?.(value);
  };

  return (
    <div className="max-w-screen-xl w-full mx-auto px-4">
      <div className="flex flex-col gap-4 mb-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200 mt-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-1">
              <Link 
                href={`/${user}`}
                className="hover:text-gray-600 transition-colors"
              >
                {user}
              </Link>
              <span className="text-gray-800">/</span>
              <a 
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-600 transition-colors"
              >
                {repo}
              </a>
            </h1>
            <div className="flex items-center gap-4 mt-1">
              {fileCount !== undefined && (
                <p className="text-sm text-gray-600">
                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                </p>
              )}
              {loadingBranches ? (
                <span className="text-xs text-gray-400">Loading branches...</span>
              ) : branchError ? (
                <span className="text-xs text-red-500">{branchError.message || 'Failed to load branches'}</span>
              ) : branches.length > 0 ? (
                <Select
                  value={selectedBranch}
                  onValueChange={handleBranchChange}
                  disabled={loadingBranches}
                >
                  <SelectTrigger className="w-[120px] text-xs">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch} value={branch} className="text-xs">
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onCopyAll}
              disabled={isCopying}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>
                {isCopying ? 'Copying' : copied ? 'Copied!' : 'Copy Code'}
              </span>
              {isCopying && <LoadingWave size="sm" color="white" />}
              {copied && <AnimatedTick size="sm" color="#10b981" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 