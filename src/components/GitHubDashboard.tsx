'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GitPullRequest, CircleDot, Filter, Menu, X, Activity, ChevronLeft, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Footer } from '@/components/Footer';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ActivityFeed } from '@/components/ActivityFeed';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Extract main content to reuse between mobile and desktop
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
    <div className="flex-1 p-6 md:p-12 space-y-10 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="space-y-3 mb-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
          Beta Dashboard
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Welcome back, <span className="text-primary">{user?.name?.split(' ')[0] || 'Developer'}</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Here's a high-level overview of your development activity and pending tasks across your repositories.
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="link" size="sm" className="text-primary" asChild>
              <a href="https://github.com/pulls" target="_blank" rel="noopener noreferrer">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
        <div className="grid gap-4">
          {prsLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50 bg-card shadow-sm">
                <Skeleton className="h-6 w-2/3 mb-3" />
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
                className="group block p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <GitPullRequest className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors break-words leading-snug mb-2">
                      {pr.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">
                        {pr.repo}#{pr.number}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>opened by <span className="text-foreground font-medium">{pr.author}</span></span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{formatTimeAgo(pr.updatedTime)}</span>
                    </div>
                  </div>
                  {pr.comments > 0 && (
                    <Badge variant="secondary" className="ml-auto shrink-0 font-normal text-muted-foreground">
                      {pr.comments} comments
                    </Badge>
                  )}
                </div>
              </a>
            ))
          ) : (
            <div className="p-16 text-center border border-dashed border-border rounded-xl bg-muted/20">
              <p className="text-muted-foreground">No open pull requests found.</p>
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="link" size="sm" className="text-primary" asChild>
              <a href="https://github.com/issues" target="_blank" rel="noopener noreferrer">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
        <div className="grid gap-4">
          {issuesLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50 bg-card shadow-sm">
                <Skeleton className="h-6 w-2/3 mb-3" />
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
                className="group block p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <CircleDot className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors break-words leading-snug mb-2">
                      {issue.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">
                        {issue.repo}#{issue.number}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>opened by <span className="text-foreground font-medium">{issue.author}</span></span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{formatTimeAgo(issue.updatedTime)}</span>
                    </div>
                  </div>
                  {issue.comments > 0 && (
                    <Badge variant="secondary" className="ml-auto shrink-0 font-normal text-muted-foreground">
                      {issue.comments} comments
                    </Badge>
                  )}
                </div>
              </a>
            ))
          ) : (
            <div className="p-16 text-center border border-dashed border-border rounded-xl bg-muted/20">
              <p className="text-muted-foreground">No open issues found.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

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

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background text-foreground overflow-hidden flex flex-col">
      
      {/* Mobile Header */}
      <div className="lg:hidden flex-shrink-0 sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2"
          onClick={() => setShowLeftSidebar(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Dashboard</h1>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2"
          onClick={() => setShowRightSidebar(true)}
        >
          <Activity className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile Sidebar Drawers */}
      <div className="lg:hidden">
        {/* Left Sidebar Overlay & Drawer */}
        <div 
          className={cn(
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            showLeftSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setShowLeftSidebar(false)}
        />
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[280px] bg-background shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-border",
            showLeftSidebar ? "translate-x-0" : "-translate-x-full"
          )}
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

        {/* Right Sidebar Overlay & Drawer */}
        <div 
          className={cn(
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            showRightSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setShowRightSidebar(false)}
        />
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-[320px] bg-background shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-border flex flex-col",
            showRightSidebar ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Activity</h2>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2"
              onClick={() => setShowRightSidebar(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
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
      </div>

      {/* Desktop Layout */}
      <ResizablePanelGroup direction="horizontal" className="hidden lg:flex h-full">
        {/* Left Sidebar */}
        <ResizablePanel defaultSize={18} minSize={15} maxSize={25} className="flex p-0 border-r border-border">
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

        <ResizableHandle className="bg-transparent w-1 hover:bg-accent transition-colors" />

        {/* Main content */}
        <ResizablePanel defaultSize={57} minSize={40}>
          <main className="flex flex-col overflow-y-auto h-full min-w-0 bg-background">
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
        </ResizablePanel>

        <ResizableHandle className="bg-transparent w-1 hover:bg-accent transition-colors" />

        {/* Right Sidebar */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="flex flex-col bg-background border-l border-border">
          <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border p-6 z-10">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </div>
              <ChevronLeft className="h-4 w-4 opacity-50" />
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

      {/* Mobile Main Content Render */}
      <main className="lg:hidden flex flex-col overflow-y-auto flex-1 bg-background">
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
};
