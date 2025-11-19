'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Radio, MessageSquare, GitPullRequest, CircleDot, Filter, Menu, X } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Footer } from '@/components/Footer';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ActivityFeed } from '@/components/ActivityFeed';

export const GitHubDashboard = () => {
  const { user } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [reposExpanded, setReposExpanded] = useState(true);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [loadedActivities, setLoadedActivities] = useState<any[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreMobileRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  const { data: pullRequests, isLoading: prsLoading } = trpc.github.getUserPullRequests.useQuery({ limit: 10 });
  const { data: issues, isLoading: issuesLoading } = trpc.github.getUserIssues.useQuery({ limit: 10 });
  
  // Fetch current page of activities
  const { data: currentPageActivities, isLoading: activitiesLoading } = trpc.github.getUserActivity.useQuery({ 
    limit: pageSize, 
    page: activitiesPage 
  });

  // Combine loaded activities when new page loads
  useEffect(() => {
    if (currentPageActivities && currentPageActivities.length > 0) {
      setLoadedActivities(prev => {
        // Deduplicate by id
        const seen = new Set(prev.map(a => a.id));
        const newActivities = currentPageActivities.filter(a => !seen.has(a.id));
        return [...prev, ...newActivities];
      });
    }
  }, [currentPageActivities]);

  const activities = loadedActivities;

  // Infinite scroll: detect when user scrolls to bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !activitiesLoading && currentPageActivities && currentPageActivities.length === pageSize) {
          // Load next page if current page was full (max 5 pages = 50 items)
          setActivitiesPage(prev => Math.min(prev + 1, 5));
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    const currentMobileRef = loadMoreMobileRef.current;

    if (currentRef) observer.observe(currentRef);
    if (currentMobileRef) observer.observe(currentMobileRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
      if (currentMobileRef) observer.unobserve(currentMobileRef);
    };
  }, [activitiesLoading, currentPageActivities, pageSize]);

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
        <div
          className={`
            fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-full
            transform transition-transform duration-200 ease-in-out pointer-events-none
            ${showLeftSidebar ? 'translate-x-0 pointer-events-auto' : '-translate-x-full'}
          `}
        >
          <DashboardSidebar
            repositories={repositories}
            reposLoading={reposLoading}
            repoSearch={repoSearch}
            onRepoSearchChange={setRepoSearch}
            reposExpanded={reposExpanded}
            onReposExpandedChange={setReposExpanded}
            isMobile={true}
            onCloseMobile={() => setShowLeftSidebar(false)}
          />
        </div>

        {/* Right Sidebar - Mobile */}
        <div
          className={`
            w-[340px] border-l border-gray-200 flex flex-col flex-shrink-0
            fixed top-14 right-0 z-40 bg-white
            h-[calc(100vh-3.5rem)]
            transform transition-transform duration-200 ease-in-out pointer-events-none
            ${showRightSidebar ? 'translate-x-0 pointer-events-auto' : 'translate-x-full'}
          `}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 z-10">
            <div className="flex items-center justify-between">
              <button
                className="mr-2 p-2 hover:bg-gray-100 rounded-md"
                onClick={() => setShowRightSidebar(false)}
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-semibold text-gray-900 flex-1">Recent activity</h2>
            </div>
          </div>
          <ActivityFeed
            activities={activities}
            isLoading={activitiesLoading}
            currentPageActivities={currentPageActivities}
            pageSize={pageSize}
            activitiesPage={activitiesPage}
            maxPages={5}
            loadMoreRef={loadMoreMobileRef}
            isMobile={true}
          />
        </div>
      </div>

      {/* Desktop: Resizable panels */}
      <ResizablePanelGroup direction="horizontal" className="hidden lg:flex h-full">
        {/* Left Sidebar */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={30} className="p-0">
          <DashboardSidebar
            repositories={repositories}
            reposLoading={reposLoading}
            repoSearch={repoSearch}
            onRepoSearchChange={setRepoSearch}
            reposExpanded={reposExpanded}
            onReposExpandedChange={setReposExpanded}
            isMobile={false}
          />
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
            </div>
          </div>
          <ActivityFeed
            activities={activities}
            isLoading={activitiesLoading}
            currentPageActivities={currentPageActivities}
            pageSize={pageSize}
            activitiesPage={activitiesPage}
            maxPages={5}
            loadMoreRef={loadMoreRef}
            isMobile={false}
          />
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
