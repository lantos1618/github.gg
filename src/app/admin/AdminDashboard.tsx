"use client";

import { useState, useMemo, useCallback } from 'react';
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
import { NetworkGraph } from '@/components/admin/NetworkGraph';

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y border-[#eee]">
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
                          <div className="text-[13px] text-[#aaa]">{u.email}{u.githubUsername && ` · @${u.githubUsername}`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-[#666] capitalize">{u.userSubscriptions?.plan || 'Free'}</td>
                    <td className="py-2">
                      <span className={u.userSubscriptions?.status === 'active' ? 'text-[#34a853] font-medium' : 'text-[#aaa]'}>
                        {u.userSubscriptions?.status || 'none'}
                      </span>
                    </td>
                    <td className="py-2 text-[#888]">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
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

      {/* Batch Profile Generator */}
      <BatchProfileGenerator />

      {/* Network Explorer */}
      <NetworkExplorer />

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

// ─── Batch Profile Generator ────────────────────────────────────────

interface BatchResult {
  username: string;
  status: 'completed' | 'failed';
  error?: string;
}

function BatchProfileGenerator() {
  const [rawText, setRawText] = useState('');
  const [extractedUsernames, setExtractedUsernames] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchLogs, setBatchLogs] = useState<Array<{ message: string; type: 'info' | 'success' | 'error' }>>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [processingCurrent, setProcessingCurrent] = useState<string | null>(null);

  const extractMutation = trpc.admin.extractUsernames.useMutation();
  const enqueueMutation = trpc.admin.batchEnqueueProfiles.useMutation();
  const processMutation = trpc.admin.processNextInQueue.useMutation();
  const { data: queueStatus, refetch: refetchQueue } = trpc.admin.getQueueStatus.useQuery({ type: 'profile' }, {
    refetchInterval: isProcessing ? 3000 : false,
  });

  const handleExtract = async () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);
    try {
      const result = await extractMutation.mutateAsync({ text: rawText });
      setExtractedUsernames(result.usernames);
      setBatchLogs(prev => [...prev, { message: `Extracted ${result.usernames.length} usernames: ${result.usernames.join(', ')}`, type: 'info' }]);
    } catch (error) {
      setBatchLogs(prev => [...prev, { message: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown'}`, type: 'error' }]);
    }
    setIsExtracting(false);
  };

  const handleEnqueue = async () => {
    if (extractedUsernames.length === 0) return;
    try {
      const result = await enqueueMutation.mutateAsync({ usernames: extractedUsernames });
      setBatchLogs(prev => [...prev, { message: `Queued ${result.queued} profiles for generation`, type: 'success' }]);
      setExtractedUsernames([]);
      setRawText('');
      await refetchQueue();
    } catch (error) {
      setBatchLogs(prev => [...prev, { message: `Enqueue failed: ${error instanceof Error ? error.message : 'Unknown'}`, type: 'error' }]);
    }
  };

  const handleProcessAll = async () => {
    setIsProcessing(true);
    setBatchResults([]);
    let processed = 0;
    const maxIterations = 50; // Safety cap
    const results: BatchResult[] = [];

    for (let i = 0; i < maxIterations; i++) {
      try {
        setProcessingCurrent('Dequeuing next...');
        const result = await processMutation.mutateAsync({ type: 'profile' });
        if (!result.processed) {
          setBatchLogs(prev => [...prev, { message: `Queue drained. Processed ${processed} profiles total.`, type: 'success' }]);
          break;
        }
        processed++;
        const r = result as { username?: string; status?: string; error?: string };
        const username = r.username || '?';
        const status = (r.status === 'completed' ? 'completed' : 'failed') as 'completed' | 'failed';
        const logType = status === 'completed' ? 'success' : 'error';

        const batchResult: BatchResult = { username, status, error: r.error };
        results.push(batchResult);
        setBatchResults([...results]);

        setBatchLogs(prev => [...prev, {
          message: `${username}: ${r.status || 'unknown'}${r.error ? ` — ${r.error}` : ''}`,
          type: logType as 'success' | 'error',
        }]);
        setProcessingCurrent(username);
        await refetchQueue();
      } catch (error) {
        setBatchLogs(prev => [...prev, { message: `Processing error: ${error instanceof Error ? error.message : 'Unknown'}`, type: 'error' }]);
        break;
      }
    }
    setProcessingCurrent(null);
    setIsProcessing(false);
    await refetchQueue();
  };

  const removeUsername = (username: string) => {
    setExtractedUsernames(prev => prev.filter(u => u !== username));
  };

  return (
    <div className="mt-10 border-t border-[#eee] pt-8">
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
        Batch Profile Generator
      </div>
      <p className="text-base text-[#666] mb-6">
        Paste any text — names, URLs, lists, emails, notes — and AI will extract GitHub usernames and queue them for analysis.
      </p>

      {/* Input */}
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={"Paste anything here...\n\ne.g. \"Check out torvalds, @antfu, and github.com/tj — also sindresorhus has great repos\""}
        rows={5}
        className="w-full px-4 py-3 border-0 border-b border-[#ddd] bg-transparent text-base text-[#111] placeholder:text-[#ccc] hover:border-[#888] focus:border-[#111] focus:outline-none focus:ring-0 transition-colors resize-none mb-4"
      />

      <div className="flex gap-2 mb-6">
        <button
          onClick={handleExtract}
          disabled={!rawText.trim() || isExtracting}
          className="px-4 py-2 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isExtracting && <Loader2 className="h-4 w-4 animate-spin" />}
          Extract Usernames
        </button>
      </div>

      {/* Extracted usernames */}
      {extractedUsernames.length > 0 && (
        <div className="mb-6">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Extracted ({extractedUsernames.length})
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {extractedUsernames.map(username => (
              <span key={username} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f9fa] text-base text-[#111] border border-[#eee] rounded">
                {username}
                <button onClick={() => removeUsername(username)} className="text-[#ccc] hover:text-[#ea4335] transition-colors">&times;</button>
              </span>
            ))}
          </div>
          <button
            onClick={handleEnqueue}
            className="px-4 py-2 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors"
          >
            Queue {extractedUsernames.length} for Analysis
          </button>
        </div>
      )}

      {/* Queue status */}
      {(queueStatus && queueStatus.queueLength > 0) || isProcessing ? (
        <div className="mb-6 bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #4285f4' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#4285f4] mb-1">Queue</div>
              <div className="text-base text-[#333]">
                {isProcessing
                  ? `Processing${processingCurrent ? `: ${processingCurrent}` : '...'}  (${queueStatus?.queueLength ?? 0} remaining)`
                  : `${queueStatus?.queueLength ?? 0} profiles pending`
                }
              </div>
            </div>
            <button
              onClick={handleProcessAll}
              disabled={isProcessing || (queueStatus?.queueLength ?? 0) === 0}
              className="px-4 py-2 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isProcessing ? 'Processing...' : 'Process All'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Results summary */}
      {batchResults.length > 0 && !isProcessing && (
        <div className="mb-6">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Results
          </div>
          {/* Summary bar */}
          <div className="flex gap-4 mb-4 py-3 px-4 bg-[#f8f9fa] border border-[#eee] rounded">
            <div>
              <span className="text-[22px] font-semibold text-[#111]">{batchResults.length}</span>
              <span className="text-base text-[#888] ml-1.5">processed</span>
            </div>
            <div className="border-l border-[#eee] pl-4">
              <span className="text-[22px] font-semibold text-[#34a853]">{batchResults.filter(r => r.status === 'completed').length}</span>
              <span className="text-base text-[#888] ml-1.5">succeeded</span>
            </div>
            {batchResults.some(r => r.status === 'failed') && (
              <div className="border-l border-[#eee] pl-4">
                <span className="text-[22px] font-semibold text-[#ea4335]">{batchResults.filter(r => r.status === 'failed').length}</span>
                <span className="text-base text-[#888] ml-1.5">failed</span>
              </div>
            )}
          </div>
          {/* Per-profile results */}
          <div className="space-y-[2px]">
            {batchResults.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-[10px] px-[14px] bg-[#f8f9fa]"
                style={{ borderLeft: `3px solid ${r.status === 'completed' ? '#34a853' : '#ea4335'}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#111]">{r.username}</span>
                  {r.status === 'completed' && (
                    <Link href={`/${r.username}`} target="_blank" className="text-[#ccc] hover:text-[#111] transition-colors">
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <div className="text-base">
                  {r.status === 'completed' ? (
                    <span className="text-[#34a853] font-medium">Completed</span>
                  ) : (
                    <span className="text-[#ea4335]">{r.error || 'Failed'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setBatchResults([])}
            className="mt-3 text-[13px] text-[#aaa] hover:text-[#111] transition-colors"
          >
            Clear results
          </button>
        </div>
      )}

      {/* Logs */}
      {batchLogs.length > 0 && (
        <div className="border border-[#eee] rounded overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#eee] bg-[#f8f9fa]">
            <span className="text-[13px] font-semibold text-[#aaa] tracking-[1px] uppercase">Log</span>
            <button onClick={() => setBatchLogs([])} className="text-[13px] text-[#aaa] hover:text-[#111] transition-colors">Clear</button>
          </div>
          <div className="max-h-[200px] overflow-y-auto p-3 bg-[#fafafa]">
            <div className="space-y-1 font-mono text-[13px]">
              {batchLogs.map((log, i) => (
                <div key={i} className={
                  log.type === 'error' ? 'text-[#ea4335]' :
                  log.type === 'success' ? 'text-[#34a853]' :
                  'text-[#888]'
                }>
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Network Explorer ───────────────────────────────────────────────

function NetworkExplorer() {
  const [seedUsername, setSeedUsername] = useState('');
  const [activeUsername, setActiveUsername] = useState('');
  const [networkType, setNetworkType] = useState<'followers' | 'following'>('following');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const trpcUtils = trpc.useUtils();

  const { data: network, isLoading } = trpc.admin.getNetworkUsers.useQuery(
    { username: activeUsername, type: networkType, limit: 50 },
    { enabled: !!activeUsername }
  );

  const enqueueMutation = trpc.admin.batchEnqueueProfiles.useMutation();

  // Callback for graph node expansion — fetches followers/following for a user
  const handleExpandNode = useCallback(async (username: string) => {
    try {
      const result = await trpcUtils.admin.getNetworkUsers.fetch({
        username,
        type: networkType,
        limit: 30,
      });
      return result.users;
    } catch {
      return null;
    }
  }, [trpcUtils, networkType]);

  const handleSearch = () => {
    if (seedUsername.trim()) {
      setActiveUsername(seedUsername.trim().replace(/^@/, ''));
      setSelectedUsers(new Set());
    }
  };

  const toggleUser = (username: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const selectAll = () => {
    if (!network) return;
    const unprofiledUsers = network.users.filter(u => !u.hasGGProfile).map(u => u.username);
    setSelectedUsers(new Set(unprofiledUsers));
  };

  const handleEnqueueSelected = async () => {
    if (selectedUsers.size === 0) return;
    await enqueueMutation.mutateAsync({ usernames: Array.from(selectedUsers) });
    setSelectedUsers(new Set());
  };

  return (
    <div className="mt-10 border-t border-[#eee] pt-8">
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
        Network Explorer
      </div>
      <p className="text-base text-[#666] mb-6">
        Enter a GitHub username to explore their network. Find cracked developers through social graphs.
      </p>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          value={seedUsername}
          onChange={(e) => setSeedUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. torvalds, antfu, sindresorhus"
          className="flex-1 border-0 border-b border-[#ddd] bg-transparent text-base text-[#111] placeholder:text-[#ccc] hover:border-[#888] focus:border-[#111] focus:outline-none focus:ring-0 transition-colors py-2"
        />
        <div className="flex gap-1">
          <button
            onClick={() => { setNetworkType('following'); handleSearch(); }}
            className={`px-3 py-1.5 text-base font-medium rounded transition-colors ${networkType === 'following' ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] border border-[#eee]'}`}
          >
            Following
          </button>
          <button
            onClick={() => { setNetworkType('followers'); handleSearch(); }}
            className={`px-3 py-1.5 text-base font-medium rounded transition-colors ${networkType === 'followers' ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] border border-[#eee]'}`}
          >
            Followers
          </button>
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="py-8 text-center text-base text-[#aaa]">Loading {networkType} for {activeUsername}...</div>
      )}

      {network && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-base text-[#888]">
              {network.users.length} {network.type} of <strong className="text-[#111]">@{network.seed}</strong>
            </span>
            <div className="flex gap-2 items-center">
              {/* View toggle */}
              <div className="flex gap-1 mr-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-xs font-semibold tracking-[1px] uppercase rounded transition-colors ${viewMode === 'table' ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] border border-[#eee]'}`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  className={`px-3 py-1.5 text-xs font-semibold tracking-[1px] uppercase rounded transition-colors ${viewMode === 'graph' ? 'bg-[#111] text-white' : 'bg-[#f8f9fa] text-[#666] border border-[#eee]'}`}
                >
                  Graph
                </button>
              </div>
              {viewMode === 'table' && (
                <>
                  <button onClick={selectAll} className="text-base text-[#888] hover:text-[#111] transition-colors">
                    Select unscanned
                  </button>
                  {selectedUsers.size > 0 && (
                    <button
                      onClick={handleEnqueueSelected}
                      disabled={enqueueMutation.isPending}
                      className="px-3 py-1.5 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-50"
                    >
                      Queue {selectedUsers.size} for analysis
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {viewMode === 'graph' ? (
            <>
              <NetworkGraph
                users={network.users}
                seed={network.seed}
                onExpandNode={handleExpandNode}
                onSelectionChange={setSelectedUsers}
              />
              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleEnqueueSelected}
                    disabled={enqueueMutation.isPending}
                    className="px-3 py-1.5 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    Queue {selectedUsers.size} for analysis
                  </button>
                  <span className="text-xs text-[#999]">Shift-click nodes to select</span>
                </div>
              )}
            </>
          ) : (
            <table className="w-full text-base border-collapse">
              <thead>
                <tr className="border-b border-[#ddd]">
                  <td className="py-2 w-8"></td>
                  <td className="py-2 text-xs text-[#999] font-semibold">Developer</td>
                  <td className="py-2 text-xs text-[#999] font-semibold hidden sm:table-cell">Bio</td>
                  <td className="py-2 text-xs text-[#999] font-semibold text-center">Repos</td>
                  <td className="py-2 text-xs text-[#999] font-semibold text-center">Followers</td>
                  <td className="py-2 text-xs text-[#999] font-semibold text-center">GG</td>
                </tr>
              </thead>
              <tbody>
                {network.users.map((u) => (
                  <tr key={u.username} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                    <td className="py-2 px-1">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(u.username)}
                        onChange={() => toggleUser(u.username)}
                        className="accent-[#111]"
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <img src={u.avatar} alt={u.username} className="h-6 w-6 rounded-full" />
                        <a
                          href={`/${u.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#111] hover:text-[#666] transition-colors"
                        >
                          {u.username}
                        </a>
                        {u.name && <span className="text-[#aaa] hidden md:inline">{u.name}</span>}
                      </div>
                    </td>
                    <td className="py-2 text-[#888] text-base line-clamp-1 max-w-xs hidden sm:table-cell">{u.bio || '—'}</td>
                    <td className="py-2 text-center text-[#666]">{u.publicRepos}</td>
                    <td className="py-2 text-center font-semibold text-[#111]">{u.followers}</td>
                    <td className="py-2 text-center">
                      {u.hasGGProfile ? (
                        <span className="text-[#34a853] font-semibold">Yes</span>
                      ) : (
                        <span className="text-[#ccc]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
