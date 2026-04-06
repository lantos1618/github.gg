import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';
import { headers } from 'next/headers';
import { createCaller } from '@/lib/trpc/server';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList } as Request);
  if (!session?.user) {
    redirect('/auth/sign-in?callbackURL=/admin');
  }

  const caller = await createCaller();
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [usageStats, subscriptionStats, allUsers, dailyStats] = await Promise.all([
    caller.admin.getUsageStats({ startDate, endDate }).catch(() => null),
    caller.admin.getSubscriptionStats().catch(() => null),
    caller.admin.getAllUsers({ startDate, endDate }).catch(() => null),
    caller.admin.getDailyStats().catch(() => null),
  ]);

  return <AdminDashboard initialData={{ usageStats, subscriptionStats, allUsers, dailyStats }} />;
}
