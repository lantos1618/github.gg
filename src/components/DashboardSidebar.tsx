'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Search, ChevronDown, ChevronRight, X } from 'lucide-react';
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
  const baseClasses = 'flex flex-col bg-white flex-shrink-0 border-r border-gray-100 h-full w-full';
  const containerClass = isMobile ? 'w-[280px] fixed top-0 left-0 z-50 shadow-2xl' : '';

  return (
    <aside className={`${baseClasses} ${containerClass}`}>
      {/* Fixed header section */}
      <div className="flex-shrink-0 p-4 space-y-6">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-black hover:bg-gray-50 rounded-md transition-colors w-full text-left">
            <ChevronRight className="w-4 h-4" />
            <Home className="w-4 h-4" />
            Overview
          </button>
          {isMobile && (
            <button
              className="p-2 hover:bg-gray-100 rounded-md"
              onClick={onCloseMobile}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div 
            className="flex items-center justify-between px-2 cursor-pointer group"
            onClick={() => onReposExpandedChange(!reposExpanded)}
          >
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Repositories</span>
            <ChevronDown
              className={`w-3 h-3 text-gray-400 group-hover:text-black transition-transform duration-200 ${
                reposExpanded ? '' : '-rotate-90'
              }`}
            />
          </div>
          
          {reposExpanded && (
            <div className="relative px-2">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={repoSearch}
                onChange={(e) => onRepoSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border-none rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Scrollable repository list */}
      <nav className={`flex-1 overflow-y-auto px-2 pb-4 ${reposExpanded ? '' : 'hidden'}`}>
        <div className="space-y-1">
          {reposLoading ? (
            <>
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </>
          ) : (
            repositories?.map((repo) => (
              <Link
                key={repo.fullName}
                href={`/${repo.owner}/${repo.name}`}
                className="flex items-center gap-3 px-2 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg group transition-all duration-200"
              >
                <img
                  src={`https://github.com/${repo.owner}.png`}
                  alt={repo.owner}
                  className="w-5 h-5 rounded-full flex-shrink-0 grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100"
                />
                <span className="truncate font-medium">
                  {repo.name}
                </span>
              </Link>
            ))
          )}
        </div>
      </nav>
    </aside>
  );
};
