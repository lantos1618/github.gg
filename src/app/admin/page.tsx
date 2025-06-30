import { AuthService } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const session = await AuthService.getUnifiedSession();
  if (!session.isSignedIn) {
    redirect('/api/auth/signin');
  }
  return <AdminDashboard />;
} 
