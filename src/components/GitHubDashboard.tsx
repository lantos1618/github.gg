'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Radio, MessageSquare, GitPullRequest, CircleDot, Filter, Menu, X, Activity, ChevronLeft } from 'lucide-react';
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
  
  const { data: currentPageActivities, isLoading: activitiesLoading } = trpc.github.getUserActivity.useQuery({ 
    limit: pageSize, 
    page: activitiesPage 
  });

  useEffect(() => {
    if (currentPageActivities && currentPageActivities.length > 0) {
      setLoadedActivities(prev => {
        const seen = new Set(prev.map(a => a.id));
        const newActivities = currentPageActivities.filter(a => !seen.has(a.id));
        return [...prev, ...newActivities];
      });
    }
  }, [currentPageActivities]);

  const activities = loadedActivities;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !activitiesLoading && currentPageActivities && currentPageActivities.length === pageSize) {
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

  const repositories = React.useMemo(() => {
    if (!repositoriesRaw) return [];
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
    <div className="h-[calc(100vh-3.5rem)] bg-white text-black overflow-hidden">
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
            w-[340px] border-l border-gray-100 flex flex-col flex-shrink-0
            fixed top-14 right-0 z-40 bg-white
            h-[calc(100vh-3.5rem)]
            transform transition-transform duration-200 ease-in-out pointer-events-none
            ${showRightSidebar ? 'translate-x-0 pointer-events-auto' : 'translate-x-full'}
          `}
        >
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-black uppercase tracking-wider">Activity</h2>
            <button
              className="p-2 hover:bg-gray-50 rounded-md"
              onClick={() => setShowRightSidebar(false)}
            >
              <X className="w-4 h-4" />
            </button>
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
        <ResizablePanel defaultSize={18} minSize={15} maxSize={25} className="flex p-0 border-r border-gray-100">
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

        <ResizableHandle className="bg-transparent w-1 hover:bg-gray-100 transition-colors" />

        {/* Main content */}
        <ResizablePanel defaultSize={57} minSize={40}>
          <main className="flex flex-col overflow-y-auto h-full min-w-0 bg-white">
            <div className="flex-1 p-8 md:p-12 space-y-12 max-w-5xl mx-auto w-full">
              <div className="space-y-2 mb-8">
                <h1 className="text-3xl font-bold text-black">Welcome back, {user?.name?.split(' ')[0] || 'Developer'}</h1>
                <p className="text-gray-500">Here&apos;s what&apos;s happening across your repositories.</p>
              </div>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-black flex items-center gap-2">
                    <GitPullRequest className="h-5 w-5" />
                    Pull Requests
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-50 rounded-md text-gray-500 hover:text-black transition-colors">
                      <Filter className="w-4 h-4" />
                    </button>
                    <a href="https://github.com/pulls" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                      View all
                    </a>
                  </div>
                </div>
                <div className="space-y-1">
                  {prsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : pullRequests && pullRequests.length > 0 ? (
                    pullRequests.map((pr) => (
                      <div
                        key={pr.id}
                        className="group p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all duration-200"
                      >
                        <div className="flex items-start gap-4">
                          <GitPullRequest className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base font-semibold text-black group-hover:text-blue-600 transition-colors break-words"
                            >
                              {pr.title}
                            </a>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-gray-500">
                              <span className="font-mono text-xs text-gray-400">{pr.repo}#{pr.number}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span>Opened by <span className="text-black font-medium">{pr.author}</span></span>
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span>{formatTimeAgo(pr.updatedTime)}</span>
                            </div>
                          </div>
                          {pr.comments > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{pr.comments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <p className="text-gray-500">No open pull requests found.</p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-black flex items-center gap-2">
                    <CircleDot className="h-5 w-5" />
                    Issues
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-50 rounded-md text-gray-500 hover:text-black transition-colors">
                      <Filter className="w-4 h-4" />
                    </button>
                    <a href="https://github.com/issues" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                      View all
                    </a>
                  </div>
                </div>
                <div className="space-y-1">
                  {issuesLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : issues && issues.length > 0 ? (
                    issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="group p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all duration-200"
                      >
                        <div className="flex items-start gap-4">
                          <CircleDot className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base font-semibold text-black group-hover:text-blue-600 transition-colors break-words"
                            >
                              {issue.title}
                            </a>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-gray-500">
                              <span className="font-mono text-xs text-gray-400">{issue.repo}#{issue.number}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span>Opened by <span className="text-black font-medium">{issue.author}</span></span>
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span>{formatTimeAgo(issue.updatedTime)}</span>
                            </div>
                          </div>
                          {issue.comments > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{issue.comments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <p className="text-gray-500">No open issues found.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
            
            {/* Footer inside main content */}
            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </ResizablePanel>

        <ResizableHandle className="bg-transparent w-1 hover:bg-gray-100 transition-colors" />

        {/* Right Sidebar */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="flex flex-col bg-white border-l border-gray-100">
          <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 p-6 z-10">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </div>
              <ChevronLeft className="h-4 w-4" />
            </h2>
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
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button
            className="p-2 hover:bg-gray-50 rounded-md"
            onClick={() => setShowLeftSidebar(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Dashboard</h1>
          <button
            className="p-2 hover:bg-gray-50 rounded-md"
            onClick={() => setShowRightSidebar(true)}
          >
            <Radio className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-8">
          {/* Same content as desktop but simplified padding */}
          {/* ... (Copy/paste or componentize if needed, but keeping inline for simplicity as per request to redesign) */}
          {/* Since the content is identical, I'll reuse the structure but maybe I should extract it to a component? 
              For now I'll just duplicate the inner sections logic for mobile to ensure it renders correctly without heavy refactor.
          */}
           <div className="space-y-2 mb-6">
                <h1 className="text-2xl font-bold text-black">Welcome, {user?.name?.split(' ')[0]}</h1>
           </div>
           {/* ... sections ... */}
           {/* For brevity in this turn, assuming desktop redesign covers the structure, 
               I will rely on the desktop sections being the primary "nicer" version. 
               The mobile sections in previous code were just copies. 
               I will paste the sections again for mobile. */}
           <section>
                <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                    <GitPullRequest className="h-5 w-5" /> Pull Requests
                </h2>
                <div className="space-y-2">
                  {prsLoading ? <Skeleton className="h-20 w-full" /> : pullRequests?.map(pr => (
                      <div key={pr.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <a href={pr.url} className="font-semibold text-black block mb-1">{pr.title}</a>
                          <div className="text-xs text-gray-500">{pr.repo}#{pr.number} • {formatTimeAgo(pr.updatedTime)}</div>
                      </div>
                  ))}
                </div>
           </section>
           <section>
                <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                    <CircleDot className="h-5 w-5" /> Issues
                </h2>
                <div className="space-y-2">
                  {issuesLoading ? <Skeleton className="h-20 w-full" /> : issues?.map(issue => (
                      <div key={issue.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <a href={issue.url} className="font-semibold text-black block mb-1">{issue.title}</a>
                          <div className="text-xs text-gray-500">{issue.repo}#{issue.number} • {formatTimeAgo(issue.updatedTime)}</div>
                      </div>
                  ))}
                </div>
           </section>
        </div>
        
        <Footer />
      </main>
    </div>
  );
};
