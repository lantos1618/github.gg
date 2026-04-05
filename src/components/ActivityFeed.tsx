'use client';

import React, { RefObject } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from 'boneyard-js/react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  repo: string;
  title: string;
  url: string;
  unread: boolean;
  isComment: boolean;
  commentAuthor?: string;
  commentAuthorAvatar?: string;
  commentBody?: string;
  issueNumber: number;
  statusText: string;
  status: string;
  comments: number;
  timeAgo: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
  currentPageActivities: Activity[] | undefined;
  pageSize: number;
  activitiesPage: number;
  maxPages: number;
  loadMoreRef?: RefObject<HTMLDivElement | null>;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading,
  currentPageActivities,
  pageSize,
  activitiesPage,
  maxPages,
  loadMoreRef,
}) => {
  const formatTimeAgo = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <Skeleton
        name="activity-feed"
        loading={isLoading && activities.length === 0}
        fallback={
          <div className="relative border-l border-border ml-2 pl-5 py-4 space-y-4">
            <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
          </div>
        }
        fixture={
          <div className="relative border-l border-border ml-2 space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative pl-5">
                <div className="absolute left-[-4px] top-1.5 h-2 w-2 rounded-full bg-gray-300" />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                  <div className="h-4 w-4/5 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        }
      >
      <div className="relative border-l border-border ml-2 space-y-6">
        {activities && activities.length > 0 ? (
          <>
            {activities.map((activity) => (
              <div key={activity.id} className="relative pl-5 group">
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute left-[-4px] top-1.5 h-2 w-2 rounded-full border-2 border-background transition-colors",
                    activity.unread
                      ? 'bg-primary ring-2 ring-primary/20'
                      : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                  )}
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <span className="font-mono truncate max-w-[120px]">
                      {activity.repo}{activity.issueNumber > 0 && `#${activity.issueNumber}`}
                    </span>
                    <span className="text-border">•</span>
                    <span className="shrink-0">{formatTimeAgo(activity.timeAgo)}</span>
                  </div>

                  <a
                    href={activity.url || `https://github.com/${activity.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm font-medium text-foreground hover:text-primary transition-colors leading-snug line-clamp-2"
                  >
                    {activity.title}
                  </a>

                  {activity.isComment && activity.commentBody && (
                    <div className="mt-1.5 text-xs bg-muted/50 p-2.5 rounded-md border border-border text-muted-foreground line-clamp-2">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                        {activity.commentAuthorAvatar && (
                          <img src={activity.commentAuthorAvatar} width={14} height={14} className="w-3.5 h-3.5 rounded-full" alt={`${activity.commentAuthor}'s avatar`} />
                        )}
                        <span className="font-medium text-foreground/80">{activity.commentAuthor}</span>
                      </div>
                      {activity.commentBody.replace(/```[\s\S]*?```/g, '[code]').substring(0, 80)}
                    </div>
                  )}

                  {(activity.status === 'review_requested' || activity.status === 'mention') && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {activity.status === 'review_requested' && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          Review
                        </span>
                      )}
                      {activity.status === 'mention' && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          Mention
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Load more trigger */}
            {currentPageActivities &&
              currentPageActivities.length === pageSize &&
              activitiesPage < maxPages && (
                <div ref={loadMoreRef} className="py-3 pl-5">
                  <div className="animate-pulse rounded-md bg-gray-200 h-8 w-full" />
                </div>
              )}
          </>
        ) : (
          <div className="pl-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )}
      </div>
      </Skeleton>
    </div>
  );
};
