'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { DollarSign, Users, RefreshCw } from 'lucide-react';
import { formatCost } from '@/lib/utils/cost-calculator';

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start,
    endDate: end,
  };
}

export default function AdminPage() {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

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

  const handleRefresh = () => {
    refetchUsage();
    refetchSubscriptions();
    refetchUsers();
    toast.success('Data refreshed!');
  };

  const loading = loadingUsage || loadingSubs || loadingUsers;
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
            <div className="text-3xl font-bold">{formatCost(usageStats?.summary.totalCost || 0)}</div>
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
              {allUsers?.slice(0, 10).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {user.image && (
                      <img 
                        src={user.image} 
                        alt={user.name || user.email} 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <h4 className="font-semibold">{user.name || 'Unknown'}</h4>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.summary.totalTokens.toLocaleString()} tokens • {formatCost(user.summary.totalCost)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCost(user.summary.totalCost)}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.userSubscriptions?.plan || 'Free'} plan
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 