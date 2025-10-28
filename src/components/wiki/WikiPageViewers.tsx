'use client';

import { trpc } from '@/lib/trpc/client';
import { Eye, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface WikiPageViewersProps {
  owner: string;
  repo: string;
  slug: string;
  version?: number;
  totalViewCount: number;
}

export function WikiPageViewers({ owner, repo, slug, version, totalViewCount }: WikiPageViewersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = trpc.wiki.getWikiPageViewers.useQuery({ owner, repo, slug, version });

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Check if anyone is actively viewing (within 5 minutes)
  const hasActiveViewers = data?.viewers.some(viewer => {
    const lastViewedDate = new Date(viewer.lastViewedAt);
    return Date.now() - lastViewedDate.getTime() < 5 * 60 * 1000;
  }) || false;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer relative"
      >
        <Eye className="h-4 w-4" />
        <span>{totalViewCount} views</span>
        {hasActiveViewers && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse border border-background" />
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Page Viewers</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {data?.viewers.length || 0} {data?.viewers.length === 1 ? 'user' : 'users'} · {data?.totalViews || 0} total views
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {data?.viewers.map((viewer) => {
                const lastViewedDate = new Date(viewer.lastViewedAt);
                const isRecent = Date.now() - lastViewedDate.getTime() < 5 * 60 * 1000; // Within 5 minutes

                return (
                  <div
                    key={viewer.userId}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage
                        src={`https://avatars.githubusercontent.com/${viewer.username}`}
                        alt={viewer.username || 'User'}
                      />
                      <AvatarFallback>{viewer.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={`/${viewer.username}`}
                          className="font-semibold text-foreground hover:text-primary truncate"
                          onClick={() => setIsOpen(false)}
                        >
                          {viewer.username}
                        </a>
                        {isRecent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium flex-shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>{viewer.viewCount} {viewer.viewCount === 1 ? 'view' : 'views'}</div>
                        <div>Last viewed {formatDistanceToNow(lastViewedDate, { addSuffix: true })}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
