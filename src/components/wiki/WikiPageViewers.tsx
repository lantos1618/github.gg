'use client';

import { trpc } from '@/lib/trpc/client';
import { Eye, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WikiPageViewersProps {
  owner: string;
  repo: string;
  slug: string;
  version?: number;
}

export function WikiPageViewers({ owner, repo, slug, version }: WikiPageViewersProps) {
  const { data } = trpc.wiki.getWikiPageViewers.useQuery({ owner, repo, slug, version });

  if (!data || data.viewers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors cursor-help">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{data.viewers.length}</span>
            <span className="text-xs text-muted-foreground">
              {data.viewers.length === 1 ? 'viewer' : 'viewers'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Recent Viewers</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.viewers.slice(0, 10).map((viewer) => (
                <div
                  key={viewer.userId}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-medium truncate">{viewer.username}</span>
                    <span className="text-muted-foreground">
                      {viewer.viewCount} {viewer.viewCount === 1 ? 'view' : 'views'}
                    </span>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap text-[10px]">
                    {new Date(viewer.lastViewedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
              {data.viewers.length > 10 && (
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  +{data.viewers.length - 10} more
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              Total views by logged-in users: {data.totalViews}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
