"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { DollarSign, Users, RefreshCw } from 'lucide-react';
import { formatCost, calculatePerUserCostAndUsage } from '@/lib/utils/cost-calculator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Image from 'next/image';

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
    toast.success('Data refreshed!');
  };

  const loading = loadingUsage || loadingSubs || loadingUsers || loadingDailyStats;
  const noData = !loading && (!usageStats || usageStats.summary.totalTokens === 0);

  return (
    <div className="container py-8 max-w-3xl px-4 md:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Total Cost & Subscribers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

      {/* Top Users by Cost */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
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
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                      <h4 className="font-semibold">{user.name || 'Unknown'}</h4>
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
                </div>
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