'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Search, ChevronDown, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardSidebarProps {
  repositories: Array<{
    fullName: string;
    owner: string;
    name: string;
  }>;
  reposLoading: boolean;
  repoSearch: string;
  onRepoSearchChange: (value: string) => void;
  reposExpanded: boolean;
  onReposExpandedChange: (value: boolean) => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  repositories,
  reposLoading,
  repoSearch,
  onRepoSearchChange,
  reposExpanded,
  onReposExpandedChange,
  isMobile = false,
  onCloseMobile,
}) => {
  const baseClasses = 'flex flex-col border-gray-200 flex-shrink-0 bg-white border-r';

  const containerClass = isMobile ? 'w-[280px]' : '';

  return (
    <aside className={`${baseClasses} ${containerClass}`}>
      {/* Fixed header section */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="p-2 flex items-center justify-between">
          <button className="flex-1 flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-900 font-medium">
            <Home className="w-4 h-4" />
            Home
          </button>
          {isMobile && (
            <button
              className="ml-2 p-2 hover:bg-gray-100 rounded-md"
              onClick={onCloseMobile}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-2 pb-2">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Repositories</span>
            <button
              className="p-0.5 hover:bg-gray-100 rounded"
              onClick={() => onReposExpandedChange(!reposExpanded)}
            >
              <ChevronDown
                className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${
                  reposExpanded ? '' : '-rotate-90'
                }`}
              />
            </button>
          </div>
          {reposExpanded && (
            <div className="relative px-3">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search for repositories"
                value={repoSearch}
                onChange={(e) => onRepoSearchChange(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Scrollable repository list */}
      <nav className={`flex-1 overflow-y-auto ${reposExpanded ? '' : 'hidden'}`}>
        <div className="px-2 py-2">
          <div className="space-y-0.5">
            {reposLoading ? (
              <>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </>
            ) : (
              repositories?.map((repo) => (
                <Link
                  key={repo.fullName}
                  href={`/${repo.owner}/${repo.name}`}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-100 rounded-md text-left group"
                >
                  <img
                    src={`https://github.com/${repo.owner}.png`}
                    alt={repo.owner}
                    className="w-5 h-5 rounded-full flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 truncate group-hover:text-gray-900 font-medium">
                    {repo.fullName}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
};
