'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Webhook, Activity, Search, RefreshCw, ExternalLink, Sparkles, Zap, Shield, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSession } from '@/lib/auth/client';
import { SortableTable, Column } from '@/components/ui/sortable-table';
import { FeatureCard, PageHeader, CardWithHeader } from '@/components/common';

type RepoWithActivity = {
  id: string;
  repositoryId: number;
  fullName: string;
  webhookEnabled: boolean;
  lastActivity?: Date;
};

export default function AutomationsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [repoSearch, setRepoSearch] = useState('');
  const [activitySearch, setActivitySearch] = useState('');

  // Queries
  const { data: repos, refetch: refetchRepos } = trpc.webhooks.getRepositories.useQuery();
  const { data: activityLog } = trpc.webhooks.getActivityLog.useQuery({
    limit: 50,
  });
  const { data: installationInfo } = trpc.webhooks.getInstallationInfo.useQuery();
  const { data: webhookPrefs } = trpc.webhooks.getPreferences.useQuery();

  // Mutations
  const toggleRepoWebhook = trpc.webhooks.toggleRepoWebhook.useMutation({
    onSuccess: () => {
      toast.success('Webhook setting updated!');
      refetchRepos();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Filter repos and add activity data
  const filteredRepos = useMemo((): RepoWithActivity[] => {
    // Create a map of repo activity (most recent activity timestamp)
    const repoActivityMap = new Map<string, Date>();
    activityLog?.activities.forEach(activity => {
      if (activity.repoOwner && activity.repoName && activity.createdAt) {
        const repoFullName = `${activity.repoOwner}/${activity.repoName}`;
        const activityDate = new Date(activity.createdAt);
        const existing = repoActivityMap.get(repoFullName);
        if (!existing || activityDate > existing) {
          repoActivityMap.set(repoFullName, activityDate);
        }
      }
    });

    const filtered = repos?.filter(repo =>
      repo.fullName.toLowerCase().includes(repoSearch.toLowerCase())
    ) || [];

    return filtered.map(repo => ({
      ...repo,
      lastActivity: repoActivityMap.get(repo.fullName),
    }));
  }, [repos, repoSearch, activityLog]);

  // Filter activities by search
  const filteredActivities = activityLog?.activities.filter(activity =>
    (activity.feature?.toLowerCase().includes(activitySearch.toLowerCase()) ||
     activity.repoName?.toLowerCase().includes(activitySearch.toLowerCase()) ||
     activity.repoOwner?.toLowerCase().includes(activitySearch.toLowerCase()))
  ) || [];

  const handleToggleRepo = (repoFullName: string, currentStatus: boolean) => {
    toggleRepoWebhook.mutate({
      repoFullName,
      enabled: !currentStatus,
    });
  };

  // State for table sorting
  const [sortedRepos, setSortedRepos] = useState<RepoWithActivity[]>([]);

  // Update sorted repos whenever filteredRepos changes
  useEffect(() => {
    setSortedRepos(filteredRepos);
  }, [filteredRepos]);

  const handleRepoSort = (key: string, direction: 'asc' | 'desc' | null) => {
    if (!direction) {
      setSortedRepos(filteredRepos);
      return;
    }

    const sorted = [...filteredRepos].sort((a, b) => {
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (key) {
        case 'name':
          return a.fullName.localeCompare(b.fullName) * multiplier;
        case 'status':
          return ((a.webhookEnabled ? 1 : 0) - (b.webhookEnabled ? 1 : 0)) * multiplier;
        case 'activity':
          if (!a.lastActivity && !b.lastActivity) return 0;
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return (a.lastActivity.getTime() - b.lastActivity.getTime()) * multiplier;
        default:
          return 0;
      }
    });

    setSortedRepos(sorted);
  };

  // Define repo table columns
  const repoColumns: Column<RepoWithActivity>[] = [
    {
      key: 'name',
      header: 'Repository',
      sortable: true,
      render: (repo) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{repo.fullName}</span>
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ),
    },
    {
      key: 'id',
      header: 'ID',
      sortable: false,
      render: (repo) => <span className="text-sm text-muted-foreground">{repo.repositoryId}</span>,
      className: 'hidden md:table-cell',
      headerClassName: 'hidden md:table-cell text-left',
    },
    {
      key: 'activity',
      header: 'Last Activity',
      sortable: true,
      render: (repo) => (
        <span className="text-sm text-muted-foreground">
          {repo.lastActivity ? formatDistanceToNow(repo.lastActivity, { addSuffix: true }) : 'Never'}
        </span>
      ),
      className: 'hidden lg:table-cell',
      headerClassName: 'hidden lg:table-cell text-left',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (repo) => (
        <div className="flex items-center gap-2">
          {repo.webhookEnabled ? (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Enabled</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="text-sm font-medium">Disabled</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'toggle',
      header: 'Actions',
      sortable: false,
      render: (repo) => (
        <Switch
          checked={repo.webhookEnabled}
          onCheckedChange={() => handleToggleRepo(repo.fullName, repo.webhookEnabled)}
          disabled={toggleRepoWebhook.isPending || !webhookPrefs?.prReviewEnabled}
        />
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
  ];

  // Show marketing content when logged out
  if (!sessionLoading && !session) {
    return (
      <div className="container py-8 max-w-6xl px-4 md:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4">AI-Powered GitHub Automations</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Let AI analyze your pull requests, provide detailed reviews, and keep your team informed - automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <FeatureCard
            icon={Sparkles}
            title="Smart PR Reviews"
            description="AI analyzes every pull request and provides detailed code reviews, catching bugs and suggesting improvements."
          />
          <FeatureCard
            icon={Zap}
            title="Instant Feedback"
            description="Get automated feedback within seconds of opening a PR. No more waiting for reviewers."
          />
          <FeatureCard
            icon={Shield}
            title="Security Scanning"
            description="Automatically detect security vulnerabilities, code smells, and potential bugs before they hit production."
          />
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to automate your workflow?</h2>
            <p className="text-muted-foreground mb-6">
              Sign in with GitHub to install our app and start automating your repositories.
            </p>
            <Button size="lg" asChild>
              <Link href="/api/auth/sign-in">
                Sign In with GitHub
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!installationInfo) {
    return (
      <div className="container py-8 max-w-6xl px-4 md:px-8">
        <h1 className="text-3xl font-bold mb-8">Automations</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-3">
                GitHub App not installed. Install the gh.gg app to enable automations.
              </p>
              <Button variant="outline" asChild>
                <a href="/install" target="_blank" rel="noopener noreferrer">
                  Install GitHub App
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl px-4 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Automations</h1>
        <p className="text-muted-foreground">
          Manage AI-powered automation for your repositories
        </p>
      </div>

      <div className="grid gap-8">
        {/* Global Settings */}
        <CardWithHeader
          title="Global Settings"
          description={`Configure global automation preferences for ${installationInfo.accountLogin}`}
          icon={Webhook}
        >
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-sm text-green-800">
                  ✓ GitHub App installed for <strong>{installationInfo.accountLogin}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>PR Review Enabled:</strong> {webhookPrefs?.prReviewEnabled ? '✓ Yes' : '✗ No'}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Auto-update Comments:</strong> {webhookPrefs?.autoUpdateEnabled ? '✓ Yes' : '✗ No'}
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/settings">
                  Manage Global Settings
                </Link>
              </Button>
            </div>
          </div>
        </CardWithHeader>

        {/* Repository Webhooks */}
        <CardWithHeader
          title="Repository Webhooks"
          description="Enable or disable AI automation for individual repositories"
          icon={Webhook}
        >
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Repos Table */}
            <SortableTable
              data={sortedRepos.length > 0 ? sortedRepos : filteredRepos}
              columns={repoColumns}
              rowKey={(repo) => repo.id}
              onSort={handleRepoSort}
              defaultSortKey="activity"
              defaultSortDirection="desc"
              emptyMessage={repoSearch ? 'No repositories found matching your search.' : 'No repositories found.'}
              maxHeight="400px"
            />
        </CardWithHeader>

        {/* Activity Log */}
        <CardWithHeader
          title="Activity Log"
          description="Recent AI automation activity across your repositories"
          icon={Activity}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          }
        >
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities by feature or repo..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Activity Table */}
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {activitySearch ? 'No activities found matching your search.' : 'No recent activity.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-sm">Feature</th>
                      <th className="text-left py-3 px-2 font-medium text-sm">Repository</th>
                      <th className="text-left py-3 px-2 font-medium text-sm hidden md:table-cell">Model</th>
                      <th className="text-right py-3 px-2 font-medium text-sm">Tokens</th>
                      <th className="text-right py-3 px-2 font-medium text-sm hidden sm:table-cell">Type</th>
                      <th className="text-right py-3 px-2 font-medium text-sm hidden lg:table-cell">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <span className="capitalize text-sm">{activity.feature}</span>
                        </td>
                        <td className="py-3 px-2">
                          {activity.repoOwner && activity.repoName ? (
                            <a
                              href={`https://github.com/${activity.repoOwner}/${activity.repoName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              <span className="truncate max-w-[200px]">
                                {activity.repoOwner}/{activity.repoName}
                              </span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] inline-block">
                            {activity.model || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-sm font-mono">
                            {activity.totalTokens.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right hidden sm:table-cell">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              activity.isByok
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {activity.isByok ? 'BYOK' : 'Managed'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {activity.createdAt
                              ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
                              : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary Stats */}
            {filteredActivities.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredActivities.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Actions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {filteredActivities
                        .reduce((sum, a) => sum + a.totalTokens, 0)
                        .toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Set(filteredActivities.map(a => a.feature)).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Features Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {new Set(
                        filteredActivities
                          .filter(a => a.repoName)
                          .map(a => `${a.repoOwner}/${a.repoName}`)
                      ).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Repos</div>
                  </div>
                </div>
              </div>
            )}
        </CardWithHeader>
      </div>
    </div>
  );
}
