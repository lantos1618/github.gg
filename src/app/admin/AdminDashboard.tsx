"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { DollarSign, Users, RefreshCw, UserCheck, Download, Play, ExternalLink } from 'lucide-react';
import { formatCost, calculatePerUserCostAndUsage } from '@/lib/utils/cost-calculator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import { SortableTable } from '@/components/ui/sortable-table';
import Link from 'next/link';
import { ReusableSSEFeedback, type SSELogItem, type SSEStatus } from '@/components/analysis/ReusableSSEFeedback';
import { sanitizeText } from '@/lib/utils/sanitize';

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start,
    endDate: end,
  };
}

export default function AdminDashboard() {
  const [dateRange] = useState(getCurrentMonthRange());
  const [userSortKey, setUserSortKey] = useState<string>('createdAt');
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc' | null>('desc');
  
  // New state for profile generation
  const [generatingUser, setGeneratingUser] = useState<string | null>(null);
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [generateInput, setGenerateInput] = useState<{ username: string; targetUserId?: string } | null>(null);
  const [sseStatus, setSseStatus] = useState<SSEStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<SSELogItem[]>([]);

  // tRPC queries
  const { data: usageStats, refetch: refetchUsage, isLoading: loadingUsage } = trpc.admin.getUsageStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: subscriptionStats, refetch: refetchSubscriptions, isLoading: loadingSubs } = trpc.admin.getSubscriptionStats.useQuery();
  const { data: allUsers, refetch: refetchUsers, isLoading: loadingUsers } = trpc.admin.getAllUsers.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: dailyStats, isLoading: loadingDailyStats } = trpc.admin.getDailyStats.useQuery();
  const triggerAnalysisMutation = trpc.admin.triggerAnalysis.useMutation();

  // Admin Profile Generation Subscription
  // Only subscribe when we have valid input to prevent hanging connections
  trpc.admin.generateProfile.useSubscription(
    generateInput ?? { username: '', targetUserId: undefined },
    {
      enabled: shouldGenerate && !!generateInput?.username,
      onData: (event: any) => {
        if (event.type === 'progress') {
          const pct = event.progress || 0;
          const message = sanitizeText(event.message || 'Processing...');
          setSseStatus('processing');
          setProgress(pct);
          setCurrentStep(message);
          setLogs((prev: SSELogItem[]) => [...prev, { message: `${message} (${pct}%)`, timestamp: new Date(), type: 'info' }]);
        } else if (event.type === 'complete') {
          setSseStatus('complete');
          setProgress(100);
          const message = `Profile generated for ${event.data.username}`;
          setCurrentStep(message);
          setLogs((prev: SSELogItem[]) => [...prev, { message: `✅ ${message}`, timestamp: new Date(), type: 'success' }]);
          setGeneratingUser(null);
          setShouldGenerate(false);
          setGenerateInput(null);
        } else if (event.type === 'error') {
          const message = sanitizeText(event.message || 'Failed to generate profile');
          setSseStatus('error');
          setCurrentStep(message);
          setLogs((prev: SSELogItem[]) => [...prev, { message, timestamp: new Date(), type: 'error' }]);
          setGeneratingUser(null);
          setShouldGenerate(false);
          setGenerateInput(null);
        }
      },
      onError: (err) => {
        const message = err.message || 'Connection error';
        setSseStatus('error');
        setCurrentStep(message);
        setLogs((prev: SSELogItem[]) => [...prev, { message, timestamp: new Date(), type: 'error' }]);
        setGeneratingUser(null);
        setShouldGenerate(false);
        setGenerateInput(null);
      }
    }
  );

  const handleTriggerAnalysis = async () => {
    if (!sortedUsers || sortedUsers.length === 0) return;
    
    try {
      const userIds = sortedUsers.map(u => u.id);
      const result = await triggerAnalysisMutation.mutateAsync({ userIds });
      setLogs((prev: SSELogItem[]) => [...prev, { message: `Triggered analysis refresh for ${result.count} users`, timestamp: new Date(), type: 'success' }]);
    } catch (error) {
      setLogs((prev: SSELogItem[]) => [...prev, { message: 'Failed to trigger analysis', timestamp: new Date(), type: 'error' }]);
      console.error(error);
    }
  };

  const handleGenerateProfile = (user: any) => {
    const targetUsername = user.githubUsername || user.name;
    if (!targetUsername) {
      setLogs((prev: SSELogItem[]) => [...prev, { message: 'User has no username to analyze', timestamp: new Date(), type: 'error' }]);
      return;
    }
    setGeneratingUser(user.id);
    setGenerateInput({ username: targetUsername, targetUserId: user.id });
    setShouldGenerate(true);
    
    setSseStatus('processing');
    setProgress(0);
    const initMessage = `Initializing analysis for ${targetUsername}...`;
    setCurrentStep(initMessage);
    setLogs((prev: SSELogItem[]) => [...prev, { message: initMessage, timestamp: new Date(), type: 'info' }]);
  };

  // Calculate total cost for the month from dailyStats (for summary card)
  const totalMonthlyCost = dailyStats && dailyStats.length > 0
    ? dailyStats.reduce((sum, day) => sum + (day.cost || 0), 0)
    : 0;

  // Calculate per-user cost and usage for the month from dailyStats (for Top Users by Cost)
  let topUsers: Array<{
    id: string;
    name?: string;
    email?: string;
    image?: string;
    githubUsername?: string | null;
    totalCost: number;
    totalTokens: number;
    byokTokens: number;
    managedTokens: number;
    plan?: string;
  }> = [];
  if (allUsers && dailyStats && usageStats && usageStats.usage) {
    // Map userId to user info
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    // Flatten all usage records for the month
    const usageRecords = usageStats.usage.map(u => ({
      userId: u.userId,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
      isByok: u.isByok,
      model: u.model ?? undefined,
    }));
    // Calculate per-user cost and usage
    const perUser = calculatePerUserCostAndUsage(usageRecords);
    topUsers = Array.from(perUser.entries()).map(([userId, stats]) => {
      const user = userMap.get(userId);
      return {
        id: userId,
        name: user?.name,
        email: user?.email,
        image: user?.image ?? undefined,
        githubUsername: user?.githubUsername,
        totalCost: stats.totalCost,
        totalTokens: stats.totalTokens,
        byokTokens: stats.byokTokens,
        managedTokens: stats.managedTokens,
        plan: user?.userSubscriptions?.plan,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  }

  const handleRefresh = () => {
    refetchUsage();
    refetchSubscriptions();
    refetchUsers();
    setLogs((prev: SSELogItem[]) => [...prev, { message: 'Admin data refreshed', timestamp: new Date(), type: 'success' }]);
  };

  const handleExportDeveloperProfiles = async () => {
    try {
      const response = await fetch('/api/admin/export-developer-profiles');
      if (!response.ok) {
        throw new Error('Failed to export developer profiles');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `developer-profiles-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setLogs((prev: SSELogItem[]) => [...prev, { message: 'Developer profiles exported', timestamp: new Date(), type: 'success' }]);
    } catch (error) {
      setLogs((prev: SSELogItem[]) => [...prev, { message: 'Failed to export developer profiles', timestamp: new Date(), type: 'error' }]);
      console.error(error);
    }
  };

  const loading = loadingUsage || loadingSubs || loadingUsers || loadingDailyStats;
  const noData = !loading && (!usageStats || usageStats.summary.totalTokens === 0);

  // Sort users based on current sort settings
  const sortedUsers = useMemo(() => {
    if (!allUsers || !userSortDirection) return allUsers || [];

    const sorted = [...allUsers].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (userSortKey) {
        case 'user':
          aValue = (a.name || a.email || '').toLowerCase();
          bValue = (b.name || b.email || '').toLowerCase();
          break;
        case 'plan':
          aValue = (a.userSubscriptions?.plan || 'free').toLowerCase();
          bValue = (b.userSubscriptions?.plan || 'free').toLowerCase();
          break;
        case 'status':
          aValue = (a.userSubscriptions?.status || 'none').toLowerCase();
          bValue = (b.userSubscriptions?.status || 'none').toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return userSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return userSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [allUsers, userSortKey, userSortDirection]);

  const handleUserSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setUserSortKey(key);
    setUserSortDirection(direction);
  };

  return (
    <div className="container py-8 max-w-3xl px-4 md:px-8 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportDeveloperProfiles}>
            <Download className="h-4 w-4 mr-2" />
            Export Developer Profiles
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <ReusableSSEFeedback
        status={sseStatus}
        progress={progress}
        currentStep={currentStep}
        logs={logs}
        title="Profile generation"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allUsers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost (This Month)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCost(totalMonthlyCost)}</div>
            <p className="text-xs text-muted-foreground">
              {usageStats?.summary.totalTokens?.toLocaleString() || 0} tokens
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{subscriptionStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Monthly Revenue: ${subscriptionStats?.monthlyRevenue?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Users */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({allUsers?.length || 0})
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTriggerAnalysis}
                disabled={triggerAnalysisMutation.isPending || loadingUsers}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${triggerAnalysisMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Profiles
              </Button>
              {sortedUsers && sortedUsers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                  // Export users as CSV
                  const headers = ['Name', 'Email', 'GitHub Username', 'Plan', 'Status', 'Joined'];
                  const rows = sortedUsers.map(user => [
                    user.name || 'Unknown',
                    user.email || '',
                    user.githubUsername || '',
                    user.userSubscriptions?.plan || 'Free',
                    user.userSubscriptions?.status || 'none',
                    user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'
                  ]);

                  const csv = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                  ].join('\n');

                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  setLogs(prev => [...prev, { message: 'User list exported!', timestamp: new Date(), type: 'success' }]);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : sortedUsers && sortedUsers.length > 0 ? (
            <SortableTable
              data={sortedUsers}
              columns={[
                {
                  key: 'user',
                  header: 'User',
                  sortable: true,
                  render: (user) => (
                    <div className="flex items-center gap-3">
                      {user.image && (
                        <Image
                          src={user.image}
                          alt={user.name || user.email || 'User'}
                          className="w-8 h-8 rounded-full"
                          width={32}
                          height={32}
                        />
                      )}
                      <div className="flex flex-col">
                        <div className="font-medium flex items-center gap-2">
                          {user.name || 'Unknown'}
                          {user.githubUsername && (
                            <Link 
                              href={`/${user.githubUsername}`} 
                              target="_blank"
                              className="text-xs text-muted-foreground hover:text-primary transition-colors"
                              title="View Public Profile"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.githubUsername && (
                          <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-1 rounded w-fit mt-0.5">
                            @{user.githubUsername}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'plan',
                  header: 'Plan',
                  sortable: true,
                  render: (user) => (
                    <span className="font-medium capitalize">
                      {user.userSubscriptions?.plan || 'Free'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  sortable: true,
                  render: (user) => (
                    <span className={`capitalize ${
                      user.userSubscriptions?.status === 'active'
                        ? 'text-green-600 font-medium'
                        : 'text-muted-foreground'
                    }`}>
                      {user.userSubscriptions?.status || 'none'}
                    </span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Joined',
                  sortable: true,
                  render: (user) => (
                    <span className="text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  sortable: false,
                  render: (user) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateProfile(user)}
                      disabled={generatingUser === user.id || (!user.name && !user.githubUsername)}
                      title="Run Profile Analysis"
                    >
                      <Play className={`h-4 w-4 ${generatingUser === user.id ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
                    </Button>
                  ),
                }
              ]}
              rowKey={(user) => user.id}
              emptyMessage="No users found."
              maxHeight="600px"
              defaultSortKey="createdAt"
              defaultSortDirection="desc"
              onSort={handleUserSort}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">No users found.</div>
          )}
        </CardContent>
      </Card>

      {/* Top Users by Cost */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Top Users by Cost (This Month)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : noData ? (
            <div className="text-center py-8 text-muted-foreground">No usage data found for this month.</div>
          ) : (
            <div className="space-y-4">
              {topUsers.slice(0, 10).map((user) => (
                <Link
                  key={user.id}
                  href={user.githubUsername ? `/${user.githubUsername}` : (user.name ? `/${user.name}` : '#')}
                  target="_blank"
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    {user.image && (
                      <Image
                        src={user.image}
                        alt={user.name || user.email || 'User'}
                        className="w-8 h-8 rounded-full"
                        width={32}
                        height={32}
                      />
                    )}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {user.name || 'Unknown'}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                      </h4>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.totalTokens.toLocaleString()} tokens • {formatCost(user.totalCost)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCost(user.totalCost)}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.plan || 'Free'} plan
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost & Revenue Chart */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Cost & Revenue (Last 30 Days)</h2>
        <div className="w-full h-72 bg-white rounded-lg border p-4">
          {loadingDailyStats ? (
            <div className="text-center text-muted-foreground py-16">Loading chart...</div>
          ) : dailyStats && dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v.toFixed(2)}`} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
                <Legend />
                <Line type="monotone" dataKey="cost" stroke="#e11d48" name="Cost" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-muted-foreground py-16">No data for chart.</div>
          )}
        </div>
      </div>
    </div>
  );
}
