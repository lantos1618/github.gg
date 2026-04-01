'use client';

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
import { Calendar, Download, Check } from 'lucide-react';
import { WikiGenerationButton } from './WikiGenerationButton';

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

  const selectedBranch = useMemo(() => {
    if (loadingBranches || branches.length === 0) return refName || 'main';
    if (refName && branches.includes(refName)) return refName;
    return branches[0];
  }, [refName, branches, loadingBranches]);

  const handleBranchChange = (value: string) => {
    onBranchChange?.(value);
  };

  return (
    <div className="w-[90%] max-w-5xl mx-auto pt-6 sm:pt-8">
      <div className="mb-8">
        {/* Section label */}
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
          Repository
        </div>

        {/* Title */}
        <h1 data-testid="repo-header-title" className="text-[25px] sm:text-[31px] font-semibold text-[#111] leading-tight mb-1 break-all">
          <Link href={`/${user}`} className="hover:text-[#666] transition-colors">
            {user}
          </Link>
          <span className="text-[#ccc] mx-1">/</span>
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#666] transition-colors">
            {repo}
          </a>
        </h1>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-2 mb-6">
          {fileCount !== undefined && (
            <span className="text-base text-[#aaa]">
              {fileCount} file{fileCount !== 1 ? 's' : ''}
            </span>
          )}
          {loadingBranches ? (
            <span className="inline-block h-4 w-20 bg-[#f0f0f0] rounded animate-pulse" />
          ) : branchError ? (
            <span className="text-[13px] text-[#ea4335]">{branchError.message || 'Failed to load branches'}</span>
          ) : branches.length > 0 ? (
            <Select
              value={selectedBranch}
              onValueChange={handleBranchChange}
              disabled={loadingBranches}
            >
              <SelectTrigger data-testid="repo-header-branch-select" className="w-[120px] text-[13px] h-8 border-[#ddd]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch} value={branch} className="text-[13px]">
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onCopyAll}
            disabled={isCopying}
            className="px-4 py-2 bg-[#111] text-white text-base font-medium rounded-md hover:bg-[#333] transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isCopying ? 'Copying...' : copied ? (
              <><Check className="h-3.5 w-3.5" /> Copied</>
            ) : 'Copy Code'}
          </button>
          <button
            onClick={onDownloadAll}
            className="px-4 py-2 bg-[#f8f9fa] text-[#333] text-base font-medium rounded-md border border-[#ddd] hover:border-[#aaa] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <WikiGenerationButton owner={user} repo={repo} />
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
    <div className="mb-8">
      {versionSelector && <div className="mb-3">{versionSelector}</div>}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] font-semibold text-[#111]">{title}</h1>
          {lastUpdated && (
            <span className="flex items-center gap-1 text-[13px] text-[#aaa]">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
          {cached && (
            <span className="text-[13px] text-[#aaa] font-semibold tracking-[1px] uppercase px-2 py-0.5 bg-[#f8f9fa] border border-[#eee] rounded">Cached</span>
          )}
          {stale && (
            <span className="text-[13px] text-[#ea4335] font-semibold tracking-[1px] uppercase px-2 py-0.5 bg-red-50 border border-red-100 rounded">Stale</span>
          )}
        </div>
        {regenerateButton}
      </div>
      {children}
    </div>
  );
}
