'use client';

import React, { RefObject } from 'react';
import { MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

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
  isMobile?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading,
  currentPageActivities,
  pageSize,
  activitiesPage,
  maxPages,
  loadMoreRef,
  isMobile = false,
}) => {
  const formatTimeAgo = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="relative border-l border-gray-200 ml-3 space-y-8">
        {isLoading ? (
          <div className="pl-6 space-y-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <>
            {activities.map((activity) => (
              <div key={activity.id} className="relative pl-6 group">
                {/* Timeline dot */}
                <div className={`absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${activity.unread ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-gray-300 group-hover:bg-gray-400 transition-colors'}`} />
                
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">{activity.repo}{activity.issueNumber > 0 && `#${activity.issueNumber}`}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(activity.timeAgo)}</span>
                  </div>
                  
                  <a
                    href={activity.url || `https://github.com/${activity.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors leading-snug"
                  >
                    {activity.title}
                  </a>

                  {activity.isComment && activity.commentBody && (
                    <div className="mt-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 text-gray-600 line-clamp-3">
                      <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                        {activity.commentAuthorAvatar && (
                          <img src={activity.commentAuthorAvatar} className="w-4 h-4 rounded-full" alt="" />
                        )}
                        <span className="font-semibold">{activity.commentAuthor}</span>
                      </div>
                      {activity.commentBody.replace(/```[\s\S]*?```/g, '[code]').substring(0, 100)}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {activity.status === 'review_requested' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Review</span>
                    )}
                    {activity.status === 'mention' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Mention</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Load more trigger */}
            {currentPageActivities &&
              currentPageActivities.length === pageSize &&
              activitiesPage < maxPages && (
                <div ref={loadMoreRef} className="py-4 text-center pl-6">
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <div className="text-xs text-gray-400">Loading more...</div>
                  )}
                </div>
              )}
          </>
        ) : (
          <div className="pl-6 text-sm text-gray-500">No recent activity.</div>
        )}
      </div>
    </div>
  );
};
