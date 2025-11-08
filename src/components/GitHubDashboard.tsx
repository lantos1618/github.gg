'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Radio, Search, ChevronDown, MessageSquare, GitPullRequest, CircleDot, Filter, Menu, X } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Footer } from '@/components/Footer';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export const GitHubDashboard = () => {
  const { user } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [reposExpanded, setReposExpanded] = useState(true);

  const { data: pullRequests, isLoading: prsLoading } = trpc.github.getUserPullRequests.useQuery({ limit: 10 });
  const { data: issues, isLoading: issuesLoading } = trpc.github.getUserIssues.useQuery({ limit: 10 });
  const { data: activities, isLoading: activitiesLoading } = trpc.github.getUserActivity.useQuery({ limit: 10 });
  const { data: repositoriesRaw, isLoading: reposLoading } = trpc.github.getUserRepositories.useQuery({ limit: 100 });

  // Filter and sort repositories
  const repositories = React.useMemo(() => {
    if (!repositoriesRaw) return [];
    // Already sorted by GitHub API (most recently pushed first)
    // Filter by search query
    if (!repoSearch.trim()) return repositoriesRaw;

    const searchLower = repoSearch.toLowerCase();
    return repositoriesRaw.filter(repo =>
      repo.fullName.toLowerCase().includes(searchLower) ||
      repo.owner.toLowerCase().includes(searchLower) ||
      repo.name.toLowerCase().includes(searchLower)
    );
  }, [repositoriesRaw, repoSearch]);

  const formatTimeAgo = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-white text-gray-900">
      {/* Mobile: Fixed sidebars */}
      <div className="lg:hidden">
        {/* Left Sidebar - Mobile */}
      <aside className={`
        w-[280px] border-r border-gray-200 flex flex-col flex-shrink-0
          fixed top-14 left-0 z-40 bg-white
          h-[calc(100vh-3.5rem)]
        transform transition-transform duration-200 ease-in-out
          ${showLeftSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
          {/* Fixed header section */}
          <div className="flex-shrink-0 border-b border-gray-200">
            <div className="p-2 flex items-center justify-between">
            <button className="flex-1 flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-900 font-medium">
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
                className="ml-2 p-2 hover:bg-gray-100 rounded-md"
              onClick={() => setShowLeftSidebar(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

            <div className="px-2 pb-2">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Repositories</span>
              <button className="p-0.5 hover:bg-gray-100 rounded">
                <ChevronDown className="w-3 h-3 text-gray-600" />
              </button>
            </div>
              <div className="relative px-3">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search for repositories"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
                repositories?.map(repo => (
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

        {/* Right Sidebar - Mobile */}
        <aside className={`
          w-[340px] border-l border-gray-200 flex flex-col flex-shrink-0
          fixed top-14 right-0 z-40 bg-white
          h-[calc(100vh-3.5rem)]
          transform transition-transform duration-200 ease-in-out
          ${showRightSidebar ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 z-10">
            <div className="flex items-center justify-between">
              <button
                className="mr-2 p-2 hover:bg-gray-100 rounded-md"
                onClick={() => setShowRightSidebar(false)}
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-semibold text-gray-900 flex-1">Recent activity</h2>
              {!activitiesLoading && (
                <span className="text-xs text-gray-500">{activities?.length || 0} items</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-4">
              {activitiesLoading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </>
              ) : activities && activities.length > 0 ? (
                activities.map(activity => (
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
                              <span className="text-xs font-medium text-gray-900">{activity.commentAuthor}</span>
                              <span className="text-xs text-gray-500">commented</span>
                            </div>
                            <div className="text-xs text-gray-700 line-clamp-3 whitespace-pre-wrap">
                              {activity.commentBody.replace(/```[\s\S]*?```/g, '[code block]').replace(/`[^`]+`/g, '[code]')}
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
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500 mb-2">
                    No recent activity found
                  </div>
                  <div className="text-xs text-gray-400">
                    Activity includes notifications, PRs, issues, and commits
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Desktop: Resizable panels */}
      <ResizablePanelGroup direction="horizontal" className="hidden lg:flex h-full">
        {/* Left Sidebar */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={30} className="flex flex-col border-r border-gray-200 bg-white">
          {/* Fixed header section */}
          <div className="flex-shrink-0 border-b border-gray-200">
            <div className="p-2 flex items-center justify-start">
              <button className="flex-1 flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-900 font-medium">
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>

            <div className="px-2 pb-2">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Repositories</span>
                <button 
                  className="p-0.5 hover:bg-gray-100 rounded"
                  onClick={() => setReposExpanded(!reposExpanded)}
                >
                  <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${reposExpanded ? '' : '-rotate-90'}`} />
                </button>
              </div>
              {reposExpanded && (
                <div className="relative px-3">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search for repositories"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
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
                  repositories?.map(repo => (
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
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main content */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <main className="flex flex-col overflow-y-auto h-full min-w-0">
            <div className="flex-1 p-4 md:p-6 space-y-6">
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">Pull requests</h2>
                  <div className="flex items-center gap-2">
                    <a href="https://github.com/pulls" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      View all
                    </a>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Filter className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {prsLoading ? (
                    <div className="p-4 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : pullRequests && pullRequests.length > 0 ? (
                    pullRequests.map((pr, index) => (
                      <div
                        key={pr.id}
                        className={`p-3 md:p-4 hover:bg-gray-50 ${index !== pullRequests.length - 1 ? 'border-b border-gray-200' : ''}`}
                      >
                        <div className="flex items-start gap-2 md:gap-3">
                          <GitPullRequest className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-gray-900 hover:text-blue-600 break-words"
                            >
                              {pr.title}
                            </a>
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1 text-xs text-gray-600">
                              <span className="whitespace-nowrap">{pr.repo}#{pr.number}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="whitespace-nowrap">Opened by {pr.author}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="whitespace-nowrap">Updated {formatTimeAgo(pr.updatedTime)}</span>
                            </div>
                          </div>
                          {pr.comments > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{pr.comments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No open pull requests
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">Issues</h2>
                  <div className="flex items-center gap-2">
                    <a href="https://github.com/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      View all
                    </a>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Filter className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {issuesLoading ? (
                    <div className="p-4 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : issues && issues.length > 0 ? (
                    issues.map((issue, index) => (
                      <div
                        key={issue.id}
                        className={`p-3 md:p-4 hover:bg-gray-50 ${index !== issues.length - 1 ? 'border-b border-gray-200' : ''}`}
                      >
                        <div className="flex items-start gap-2 md:gap-3">
                          <CircleDot className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-gray-900 hover:text-blue-600 break-words"
                            >
                              {issue.title}
                            </a>
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1 text-xs text-gray-600">
                              <span className="whitespace-nowrap">{issue.repo}#{issue.number}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="whitespace-nowrap">Opened by {issue.author}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="whitespace-nowrap">Updated {formatTimeAgo(issue.updatedTime)}</span>
                            </div>
                          </div>
                          {issue.comments > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{issue.comments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No open issues
                    </div>
                  )}
                </div>
              </section>
            </div>
            
            {/* Footer inside main content */}
            <Footer />
          </main>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Sidebar */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="flex flex-col border-l border-gray-200 bg-white">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex-1">Recent activity</h2>
              {!activitiesLoading && (
                <span className="text-xs text-gray-500">{activities?.length || 0} items</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-4">
              {activitiesLoading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </>
              ) : activities && activities.length > 0 ? (
                activities.map(activity => (
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
                              <span className="text-xs font-medium text-gray-900">{activity.commentAuthor}</span>
                              <span className="text-xs text-gray-500">commented</span>
                            </div>
                            <div className="text-xs text-gray-700 line-clamp-3 whitespace-pre-wrap">
                              {activity.commentBody.replace(/```[\s\S]*?```/g, '[code block]').replace(/`[^`]+`/g, '[code]')}
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
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500 mb-2">
                    No recent activity found
                  </div>
                  <div className="text-xs text-gray-400">
                    Activity includes notifications, PRs, issues, and commits
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Mobile main content */}
      <main className="lg:hidden flex flex-col overflow-y-auto h-full min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button
            className="p-2 hover:bg-gray-100 rounded-md"
            onClick={() => setShowLeftSidebar(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <button
            className="p-2 hover:bg-gray-100 rounded-md"
            onClick={() => setShowRightSidebar(true)}
          >
            <Radio className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 md:p-6 space-y-6">
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Pull requests</h2>
              <div className="flex items-center gap-2">
                <a href="https://github.com/pulls" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  View all
                </a>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Filter className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {prsLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : pullRequests && pullRequests.length > 0 ? (
                pullRequests.map((pr, index) => (
                  <div
                    key={pr.id}
                    className={`p-3 md:p-4 hover:bg-gray-50 ${index !== pullRequests.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <div className="flex items-start gap-2 md:gap-3">
                      <GitPullRequest className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 break-words"
                        >
                          {pr.title}
                        </a>
                        <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1 text-xs text-gray-600">
                          <span className="whitespace-nowrap">{pr.repo}#{pr.number}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="whitespace-nowrap">Opened by {pr.author}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="whitespace-nowrap">Updated {formatTimeAgo(pr.updatedTime)}</span>
                        </div>
                      </div>
                      {pr.comments > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{pr.comments}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No open pull requests
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Issues</h2>
              <div className="flex items-center gap-2">
                <a href="https://github.com/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  View all
                </a>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Filter className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {issuesLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : issues && issues.length > 0 ? (
                issues.map((issue, index) => (
                  <div
                    key={issue.id}
                    className={`p-3 md:p-4 hover:bg-gray-50 ${index !== issues.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <div className="flex items-start gap-2 md:gap-3">
                      <CircleDot className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 break-words"
                        >
                          {issue.title}
                        </a>
                        <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1 text-xs text-gray-600">
                          <span className="whitespace-nowrap">{issue.repo}#{issue.number}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="whitespace-nowrap">Opened by {issue.author}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="whitespace-nowrap">Updated {formatTimeAgo(issue.updatedTime)}</span>
                        </div>
                      </div>
                      {issue.comments > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{issue.comments}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No open issues
                </div>
              )}
            </div>
          </section>
        </div>
        
        {/* Footer inside main content */}
        <Footer />
      </main>
    </div>
  );
};
