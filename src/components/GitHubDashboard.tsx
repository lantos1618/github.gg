'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GitPullRequest, CircleDot, Menu, X, Activity, ArrowRight, PanelRightClose, PanelRight, PanelLeftClose, PanelLeft, GitFork, Bell } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Footer } from '@/components/Footer';
// ResizablePanel removed in favor of CSS transitions for smooth animations
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ActivityFeed } from '@/components/ActivityFeed';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function DashboardContent({
  user,
  pullRequests,
  issues,
  prsLoading,
  issuesLoading
}: {
  user: any,
  pullRequests: any[],
  issues: any[],
  prsLoading: boolean,
  issuesLoading: boolean
}) {
  const formatTimeAgo = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-12 space-y-10 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="space-y-3 mb-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
          Beta Dashboard
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
          Welcome back, <span className="text-primary">{user?.name?.split(' ')[0] || 'Developer'}</span>
        </h1>
        <p className="text-base lg:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Your development activity and pending tasks across repositories.
        </p>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <GitPullRequest className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Pull Requests
          </h2>
          <Button variant="link" size="sm" className="text-primary" asChild>
            <a href="https://github.com/pulls" target="_blank" rel="noopener noreferrer">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </div>
        <div className="grid gap-3">
          {prsLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-5 rounded-xl border border-border/50 bg-card">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))
          ) : pullRequests && pullRequests.length > 0 ? (
            pullRequests.map((pr) => (
              <a
                key={pr.id}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <GitPullRequest className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                      {pr.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                        {pr.repo}#{pr.number}
                      </span>
                      <span>{formatTimeAgo(pr.updatedTime)}</span>
                      {pr.comments > 0 && (
                        <Badge variant="secondary" className="text-xs py-0 h-5">
                          {pr.comments}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="p-12 text-center border border-dashed border-border rounded-xl bg-muted/20">
              <p className="text-sm text-muted-foreground">No open pull requests</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <CircleDot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            Issues
          </h2>
          <Button variant="link" size="sm" className="text-primary" asChild>
            <a href="https://github.com/issues" target="_blank" rel="noopener noreferrer">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </div>
        <div className="grid gap-3">
          {issuesLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-5 rounded-xl border border-border/50 bg-card">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))
          ) : issues && issues.length > 0 ? (
            issues.map((issue) => (
              <a
                key={issue.id}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <CircleDot className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                      {issue.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                        {issue.repo}#{issue.number}
                      </span>
                      <span>{formatTimeAgo(issue.updatedTime)}</span>
                      {issue.comments > 0 && (
                        <Badge variant="secondary" className="text-xs py-0 h-5">
                          {issue.comments}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="p-12 text-center border border-dashed border-border rounded-xl bg-muted/20">
              <p className="text-sm text-muted-foreground">No open issues</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export const GitHubDashboard = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [repoSearch, setRepoSearch] = useState('');
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [reposSidebarCollapsed, setReposSidebarCollapsed] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [loadedActivities, setLoadedActivities] = useState<any[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);
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
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
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

  // Mobile Layout
  if (isMobile) {
    const unreadCount = activities.filter(a => a.unread).length;

    return (
      <div className="h-[calc(100vh-3.5rem)] bg-background text-foreground overflow-hidden flex flex-col">
        {/* Mobile Header - Enhanced */}
        <div className="flex-shrink-0 sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 -ml-2 rounded-xl hover:bg-muted"
              onClick={() => setShowLeftSidebar(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex flex-col items-center">
              <h1 className="text-base font-semibold">Dashboard</h1>
              <span className="text-[10px] text-muted-foreground">Welcome back</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 -mr-2 rounded-xl hover:bg-muted relative"
              onClick={() => setShowRightSidebar(true)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Backdrop - Always rendered, opacity animated */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            (showLeftSidebar || showRightSidebar) ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => {
            setShowLeftSidebar(false);
            setShowRightSidebar(false);
          }}
        />

        {/* Left Sidebar Drawer - Always rendered, transform animated */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] bg-background shadow-2xl flex flex-col transition-transform duration-300 ease-out",
            showLeftSidebar ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Drawer Header */}
          <div className="flex-shrink-0 p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GitFork className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Repositories</h2>
                  <p className="text-xs text-muted-foreground">{repositories.length} repos</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={() => setShowLeftSidebar(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DashboardSidebar
            repositories={repositories}
            reposLoading={reposLoading}
            repoSearch={repoSearch}
            onRepoSearchChange={setRepoSearch}
            isMobile={true}
            onCloseMobile={() => setShowLeftSidebar(false)}
          />
        </div>

        {/* Activity Right Drawer */}
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-[85vw] max-w-[320px] bg-background shadow-2xl flex flex-col transition-transform duration-300 ease-out",
            showRightSidebar ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Drawer Header */}
          <div className="flex-shrink-0 p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={() => setShowRightSidebar(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <ActivityFeed
              activities={activities}
              isLoading={activitiesLoading}
              currentPageActivities={currentPageActivities}
              pageSize={pageSize}
              activitiesPage={activitiesPage}
              maxPages={5}
              loadMoreRef={loadMoreRef}
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex flex-col overflow-y-auto flex-1 bg-background">
          <DashboardContent
            user={user}
            pullRequests={pullRequests || []}
            issues={issues || []}
            prsLoading={prsLoading}
            issuesLoading={issuesLoading}
          />
          <div className="mt-auto border-t border-border">
            <Footer />
          </div>
        </main>
      </div>
    );
  }

  // Desktop Layout - using CSS transitions instead of ResizablePanel for smooth animations
  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background text-foreground overflow-hidden flex">
      {/* Left Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 border-r border-border bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          reposSidebarCollapsed ? "w-11" : "w-64"
        )}
      >
        {reposSidebarCollapsed ? (
          <div className="flex flex-col items-center py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setReposSidebarCollapsed(false)}
              title="Show repositories"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                  <GitFork className="h-3.5 w-3.5 text-primary" />
                  Repositories
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => setReposSidebarCollapsed(true)}
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DashboardSidebar
              repositories={repositories}
              reposLoading={reposLoading}
              repoSearch={repoSearch}
              onRepoSearchChange={setRepoSearch}
              isMobile={false}
            />
          </>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-background">
        <DashboardContent
          user={user}
          pullRequests={pullRequests || []}
          issues={issues || []}
          prsLoading={prsLoading}
          issuesLoading={issuesLoading}
        />
        <div className="mt-auto border-t border-border">
          <Footer />
        </div>
      </main>

      {/* Right Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 border-l border-border bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          activityCollapsed ? "w-11" : "w-80"
        )}
      >
        {activityCollapsed ? (
          <div className="flex flex-col items-center py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setActivityCollapsed(false)}
              title="Show activity"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Recent Activity
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => setActivityCollapsed(true)}
                  title="Collapse sidebar"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
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
            />
          </>
        )}
      </div>
    </div>
  );
};
