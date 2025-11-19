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
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="space-y-4">
        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </>
        ) : activities && activities.length > 0 ? (
          <>
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`text-sm p-2 rounded-lg ${
                  activity.unread ? 'bg-blue-50 border border-blue-200' : ''
                } ${activity.isComment ? 'bg-gray-50 border border-gray-200' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {activity.isComment && activity.commentAuthorAvatar && (
                    <img
                      src={activity.commentAuthorAvatar}
                      alt={activity.commentAuthor}
                      className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium text-gray-900">{activity.repo}</span>
                        {activity.issueNumber > 0 && (
                          <span className="mx-1">#{activity.issueNumber}</span>
                        )}
                      </div>
                      {activity.unread && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <a
                      href={activity.url || `https://github.com/${activity.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-900 hover:text-blue-600 line-clamp-2 font-medium"
                    >
                      {activity.title}
                    </a>
                    {activity.isComment && activity.commentBody && (
                      <div className="mt-2 p-2 bg-white border border-gray-200 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-900">
                            {activity.commentAuthor}
                          </span>
                          <span className="text-xs text-gray-500">commented</span>
                        </div>
                        <div className="text-xs text-gray-700 line-clamp-3 whitespace-pre-wrap">
                          {activity.commentBody
                            .replace(/```[\s\S]*?```/g, '[code block]')
                            .replace(/`[^`]+`/g, '[code]')}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600 capitalize">{activity.statusText}</span>
                      {activity.status === 'review_requested' && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                          Action needed
                        </span>
                      )}
                      {activity.status === 'mention' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                          Mentioned
                        </span>
                      )}
                      {!activity.isComment && activity.comments > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{activity.comments}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(activity.timeAgo)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Load more trigger */}
            {currentPageActivities &&
              currentPageActivities.length === pageSize &&
              activitiesPage < maxPages && (
                <div ref={loadMoreRef} className="py-4 text-center">
                  {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <div className="text-xs text-gray-400">Scroll for more...</div>
                  )}
                </div>
              )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-sm text-gray-500 mb-2">No recent activity found</div>
            <div className="text-xs text-gray-400">
              Activity includes notifications, PRs, issues, and commits
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
