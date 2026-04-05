import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import DiscoverPage from './DiscoverPage';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList } as Request);
  if (!session?.user) {
    redirect('/api/auth/sign-in');
  }
  return <DiscoverPage />;
}
