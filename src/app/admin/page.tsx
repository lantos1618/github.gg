import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';
import { headers } from 'next/headers';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList } as Request);
  if (!session?.user) {
    redirect('/api/auth/signin');
  }
  return <AdminDashboard />;
} 
