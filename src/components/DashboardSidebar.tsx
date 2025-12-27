'use client';

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
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
  isMobile?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  repositories,
  reposLoading,
  repoSearch,
  onRepoSearchChange,
  isMobile = false,
  onCloseMobile,
  className,
}) => {
  return (
    <aside className={cn(
      "flex flex-col bg-background h-full w-full",
      className
    )}>
      {/* Search */}
      <div className={cn(
        "flex-shrink-0",
        isMobile ? "p-3" : "p-2"
      )}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Find repository..."
            value={repoSearch}
            onChange={(e) => onRepoSearchChange(e.target.value)}
            className={cn(
              "w-full pl-9 pr-3 text-sm bg-muted/50 border border-transparent focus:border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus:bg-background transition-all",
              isMobile ? "py-2.5" : "py-1.5"
            )}
          />
        </div>
      </div>

      {/* Repository list */}
      <nav className={cn(
        "flex-1 overflow-y-auto pb-3",
        isMobile ? "px-3" : "px-2"
      )}>
        <div className="space-y-1">
          {reposLoading ? (
            <div className="space-y-2 px-1">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className={cn(
                  "w-full rounded-lg",
                  isMobile ? "h-12" : "h-8"
                )} />
              ))}
            </div>
          ) : repositories && repositories.length > 0 ? (
            repositories.map((repo) => (
              <Link
                key={repo.fullName}
                href={`/${repo.owner}/${repo.name}`}
                className={cn(
                  "flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg group transition-all active:scale-[0.98]",
                  isMobile ? "px-3 py-3" : "px-2 py-2"
                )}
                onClick={isMobile ? onCloseMobile : undefined}
              >
                <img
                  src={`https://github.com/${repo.owner}.png`}
                  alt={repo.owner}
                  width={32}
                  height={32}
                  className={cn(
                    "rounded-full shrink-0 opacity-80 group-hover:opacity-100 transition-opacity",
                    isMobile ? "w-8 h-8" : "w-5 h-5"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "block truncate font-medium",
                    isMobile ? "text-sm" : "text-[13px]"
                  )}>
                    {repo.name}
                  </span>
                  {isMobile && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {repo.owner}
                    </span>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="px-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {repoSearch ? 'No matches found' : 'No repositories'}
              </p>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};
