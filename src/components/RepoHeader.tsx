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
import { Badge } from '@/components/ui/badge';
import { Calendar, Download } from 'lucide-react';

interface RepoHeaderProps {
  user: string;
  repo: string;
  refName?: string;
  onBranchChange?: (value: string) => void;
  onCopyAll: () => void;
  onDownloadAll: () => void;
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
  onDownloadAll,
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
    <div className="max-w-screen-xl w-full mx-auto px-2 sm:px-4">
      <div className="flex flex-col gap-3 sm:gap-4 mb-8 bg-white p-3 sm:p-8 rounded-xl shadow-lg border border-gray-200 mt-4 sm:mt-8">
        {/* Title row */}
        <div className="flex flex-col gap-3">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-1 break-all">
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
              className="hover:text-gray-600 transition-colors break-all"
            >
              {repo}
            </a>
          </h1>

          {/* Meta info row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {fileCount !== undefined && (
              <p className="text-xs sm:text-sm text-gray-600">
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
                <SelectTrigger className="w-full sm:w-[120px] text-xs">
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

          {/* Buttons row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full">
            <button
              onClick={onCopyAll}
              disabled={isCopying}
              className="w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed sm:min-w-[140px] justify-center cursor-pointer text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>
                {isCopying ? 'Copying...' : copied ? 'Copied!' : 'Copy Code'}
              </span>
              {isCopying && <LoadingWave size="sm" color="white" />}
              {copied && <AnimatedTick size="sm" color="#10b981" />}
            </button>
            <button
              onClick={onDownloadAll}
              className="w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 justify-center cursor-pointer text-sm"
            >
              <Download className="h-4 w-4 flex-shrink-0" />
              <span>Download All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 

interface VersionedResourceHeaderProps {
  title: React.ReactNode;
  versionSelector?: React.ReactNode;
  lastUpdated?: string | null;
  cached?: boolean;
  stale?: boolean;
  regenerateButton?: React.ReactNode;
  children?: React.ReactNode;
}

export function VersionedResourceHeader({
  title,
  versionSelector,
  lastUpdated,
  cached,
  stale,
  regenerateButton,
  children,
}: VersionedResourceHeaderProps) {
  return (
    <div className="mb-6">
      {versionSelector && <div className="mb-2">{versionSelector}</div>}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">{title}</h1>
          {lastUpdated && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
          {cached && <Badge variant="outline" className="text-xs">Cached</Badge>}
          {stale && <Badge variant="destructive" className="text-xs">Stale</Badge>}
        </div>
        {regenerateButton}
      </div>
      {children}
    </div>
  );
} 