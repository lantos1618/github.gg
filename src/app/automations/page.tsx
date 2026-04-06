import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import AutomationsClient from './AutomationsClient';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList } as Request);
  if (!session?.user) {
    redirect('/auth/sign-in?redirect=/automations');
  }
  return <AutomationsClient />;
}
