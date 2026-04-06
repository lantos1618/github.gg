import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createCaller } from '@/lib/trpc/server';
import SettingsClient, { type SettingsInitialData } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList } as Request);

  if (!session?.user) {
    redirect('/auth/sign-in?redirect=/settings');
  }

  const caller = await createCaller();

  // Fetch everything server-side so page renders correct UI immediately — no flash
  const [planData, keyStatus, me] = await Promise.all([
    caller.user.getCurrentPlan().catch(() => ({ plan: 'free' as const })),
    caller.user.getApiKeyStatus().catch(() => null),
    caller.me().catch(() => null),
  ]);

  const meData = me as { user?: { githubUsername?: string } } | null;
  const username = meData?.user?.githubUsername ?? null;
  const profileStyles = username
    ? await caller.user.getProfileStyles({ username }).catch(() => null)
    : null;

  const isPaid = planData.plan === 'pro' || planData.plan === 'byok';

  const initialData: SettingsInitialData = {
    plan: planData.plan,
    isPaid,
    keyStatus,
    profileStyles,
    username,
  };

  return <SettingsClient initialData={initialData} />;
}
