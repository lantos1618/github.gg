"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { DollarSign, Users, RefreshCw, UserCheck, Download, Play, ExternalLink, Loader2 } from 'lucide-react';
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
          const message = sanitizeText(event.message || '');
          setSseStatus('processing');
          setProgress(pct);
          setCurrentStep(message);
          setLogs((prev: SSELogItem[]) => [...prev, { message: `${message} (${pct}%)`, timestamp: new Date(), type: 'info' }]);
        } else if (event.type === 'complete') {
          setSseStatus('complete');
          setProgress(100);
          const message = `Profile generated for ${event.data.username}`;
          setCurrentStep(message);
          setLogs((prev: SSELogItem[]) => [...prev, { message: `\u2705 ${message}`, timestamp: new Date(), type: 'success' }]);
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

  type UserEntry = NonNullable<typeof allUsers>[number];

  const userValueExtractors: Record<string, (u: UserEntry) => string | number> = {
    user: (u) => (u.name || u.email || '').toLowerCase(),
    plan: (u) => (u.userSubscriptions?.plan || 'free').toLowerCase(),
    status: (u) => (u.userSubscriptions?.status || 'none').toLowerCase(),
    createdAt: (u) => u.createdAt ? new Date(u.createdAt).getTime() : 0,
  };

  const sortedUsers = useMemo(() => {
    if (!allUsers || !userSortDirection) return allUsers || [];

    const extract = userValueExtractors[userSortKey];
    if (!extract) return allUsers;

    return [...allUsers].sort((a, b) => {
      const aValue = extract(a);
      const bValue = extract(b);
      if (aValue < bValue) return userSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return userSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allUsers, userSortKey, userSortDirection]);

  const handleUserSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setUserSortKey(key);
    setUserSortDirection(direction);
  };

  return (
    <div className="w-[90%] max-w-5xl mx-auto py-12 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">Admin</div>
          <h1 className="text-[31px] font-semibold text-[#111]">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportDeveloperProfiles} className="px-3 py-1.5 text-base font-medium text-[#666] border border-[#ddd] rounded hover:border-[#111] hover:text-[#111] transition-colors flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export Profiles
          </button>
          <button onClick={handleRefresh} className="px-3 py-1.5 text-base font-medium text-[#666] border border-[#ddd] rounded hover:border-[#111] hover:text-[#111] transition-colors flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <ReusableSSEFeedback status={sseStatus} progress={progress} currentStep={currentStep} logs={logs} title="Profile generation" />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-[#eee]">
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1px] uppercase mb-1">Total Users</div>
          <div className="text-[31px] font-semibold text-[#111]">{allUsers?.length || 0}</div>
          <div className="text-base text-[#aaa]">Registered accounts</div>
        </div>
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1px] uppercase mb-1">Cost (This Month)</div>
          <div className="text-[31px] font-semibold text-[#111]">{formatCost(totalMonthlyCost)}</div>
          <div className="text-base text-[#aaa]">{usageStats?.summary.totalTokens?.toLocaleString() || 0} tokens</div>
        </div>
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1px] uppercase mb-1">Active Subscribers</div>
          <div className="text-[31px] font-semibold text-[#111]">{subscriptionStats?.active || 0}</div>
          <div className="text-base text-[#aaa]">${subscriptionStats?.monthlyRevenue?.toFixed(2) || '0.00'}/mo revenue</div>
        </div>
      </div>

      {/* All Users */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase">
            All Users ({allUsers?.length || 0})
          </div>
          <div className="flex gap-2">
            <button onClick={handleTriggerAnalysis} disabled={triggerAnalysisMutation.isPending || loadingUsers} className="px-3 py-1.5 text-base font-medium text-[#666] border border-[#ddd] rounded hover:border-[#111] hover:text-[#111] transition-colors disabled:opacity-50 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Profiles
            </button>
            {sortedUsers && sortedUsers.length > 0 && (
              <button
                onClick={() => {
                  const headers = ['Name', 'Email', 'GitHub Username', 'Plan', 'Status', 'Joined'];
                  const rows = sortedUsers.map(user => [user.name || 'Unknown', user.email || '', user.githubUsername || '', user.userSubscriptions?.plan || 'Free', user.userSubscriptions?.status || 'none', user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown']);
                  const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `users-${new Date().toISOString().split('T')[0]}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
                  setLogs(prev => [...prev, { message: 'User list exported!', timestamp: new Date(), type: 'success' }]);
                }}
                className="px-3 py-1.5 text-base font-medium text-[#666] border border-[#ddd] rounded hover:border-[#111] hover:text-[#111] transition-colors flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
            )}
          </div>
        </div>

        {loadingUsers ? (
          <div className="space-y-3 py-4">{[1,2,3,4,5].map(i => <div key={i} className="h-8 w-full bg-[#f8f9fa] rounded animate-pulse" />)}</div>
        ) : sortedUsers && sortedUsers.length > 0 ? (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-base border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-[#ddd]">
                  <td className="py-2 text-xs text-[#999] font-semibold">User</td>
                  <td className="py-2 text-xs text-[#999] font-semibold">Plan</td>
                  <td className="py-2 text-xs text-[#999] font-semibold">Status</td>
                  <td className="py-2 text-xs text-[#999] font-semibold">Joined</td>
                  <td className="py-2 text-xs text-[#999] font-semibold w-12"></td>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {u.image && <Image src={u.image} alt={u.name || ''} className="w-6 h-6 rounded-full" width={24} height={24} />}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#111]">{u.name || 'Unknown'}</span>
                            {u.githubUsername && (
                              <Link href={`/${u.githubUsername}`} target="_blank" className="text-[#ccc] hover:text-[#111] transition-colors">
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                          <div className="text-[13px] text-[#aaa]">{u.email}{u.githubUsername && ` \u00b7 @${u.githubUsername}`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-[#666] capitalize">{u.userSubscriptions?.plan || 'Free'}</td>
                    <td className="py-2">
                      <span className={u.userSubscriptions?.status === 'active' ? 'text-[#34a853] font-medium' : 'text-[#aaa]'}>
                        {u.userSubscriptions?.status || 'none'}
                      </span>
                    </td>
                    <td className="py-2 text-[#888]">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014'}</td>
                    <td className="py-2">
                      <button
                        onClick={() => handleGenerateProfile(u)}
                        disabled={generatingUser === u.id || (!u.name && !u.githubUsername)}
                        className="text-[#ccc] hover:text-[#111] transition-colors disabled:opacity-30"
                        title="Run Profile Analysis"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-base text-[#aaa]">No users found.</div>
        )}
      </div>

      {/* Top Users by Cost */}
      <div>
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">
          Top Users by Cost (This Month)
        </div>
        {loading ? (
          <div className="py-8 text-center text-base text-[#aaa]">Loading...</div>
        ) : noData ? (
          <div className="py-8 text-center text-base text-[#aaa]">No usage data this month.</div>
        ) : (
          <div className="space-y-[2px]">
            {topUsers.slice(0, 10).map((user) => (
              <Link
                key={user.id}
                href={user.githubUsername ? `/${user.githubUsername}` : (user.name ? `/${user.name}` : '#')}
                target="_blank"
                className="flex items-center justify-between bg-[#f8f9fa] py-[12px] px-[16px] hover:bg-[#f0f0f0] transition-colors group"
                style={{ borderLeft: '3px solid #f59e0b' }}
              >
                <div className="flex items-center gap-3">
                  {user.image && <Image src={user.image} alt={user.name || ''} className="w-6 h-6 rounded-full" width={24} height={24} />}
                  <div>
                    <span className="font-medium text-[#111]">{user.name || 'Unknown'}</span>
                    <span className="text-base text-[#aaa] ml-2">{user.totalTokens.toLocaleString()} tokens</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[#111]">{formatCost(user.totalCost)}</span>
                  <span className="text-base text-[#aaa] ml-2">{user.plan || 'Free'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Cost & Revenue Chart */}
      <div className="mt-10">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">Cost & Revenue (30 Days)</div>
        <div className="w-full h-72 border border-[#eee] p-4">
          {loadingDailyStats ? (
            <div className="flex items-end gap-2 h-full px-4 pb-4">{[40,65,30,80,55,70,45,60,75,50].map((h,i) => <div key={i} className="flex-1 bg-[#f8f9fa] animate-pulse" style={{height:`${h}%`}} />)}</div>
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
            <div className="text-center text-base text-[#aaa] py-16">No data for chart.</div>
          )}
        </div>
      </div>
    </div>
  );
}
