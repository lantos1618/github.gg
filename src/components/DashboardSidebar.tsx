'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Search, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  className?: string;
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
  className,
}) => {
  return (
    <aside className={cn(
      "flex flex-col bg-background border-r border-border h-full w-full transition-colors duration-300",
      className
    )}>
      {/* Fixed header section */}
      <div className="flex-shrink-0 p-4 space-y-6">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all w-full text-left group">
            <div className="p-1.5 bg-muted rounded-md group-hover:bg-background group-hover:shadow-sm transition-all">
              <Home className="w-4 h-4" />
            </div>
            <span>Overview</span>
          </button>
          {isMobile && (
            <button
              className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              onClick={onCloseMobile}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <button 
            className="flex items-center justify-between w-full px-3 py-1 cursor-pointer group"
            onClick={() => onReposExpandedChange(!reposExpanded)}
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
              Repositories
            </span>
            <ChevronDown
              className={cn(
                "w-3 h-3 text-muted-foreground/50 group-hover:text-foreground transition-transform duration-200",
                !reposExpanded && "-rotate-90"
              )}
            />
          </button>
          
          {reposExpanded && (
            <div className="relative px-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={repoSearch}
                onChange={(e) => onRepoSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 border border-transparent focus:border-border rounded-md text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0 focus:bg-background transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* Scrollable repository list */}
      <nav className={cn(
        "flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
        !reposExpanded && "hidden"
      )}>
        <div className="space-y-0.5">
          {reposLoading ? (
            <div className="space-y-2 px-1">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : (
            repositories?.map((repo) => (
              <Link
                key={repo.fullName}
                href={`/${repo.owner}/${repo.name}`}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg group transition-all duration-200"
                onClick={isMobile ? onCloseMobile : undefined}
              >
                <img
                  src={`https://github.com/${repo.owner}.png`}
                  alt={repo.owner}
                  className="w-5 h-5 rounded-full flex-shrink-0 grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100 border border-border/50"
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
