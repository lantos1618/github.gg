'use client';

import { type ReactNode, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthWithHint } from '@/lib/hooks/useAuthWithHint';

const FRESH_SIGNUP_WINDOW_MS = 60_000;
const ONBOARDING_SEEN_KEY = 'gg-seen-onboarding';

function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
// Dashboard skeleton for signed-in users while dashboard loads
function DashboardSkeleton() {
  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background flex">
      <div className="w-64 border-r border-border p-4 space-y-3 hidden lg:block">
        <div className="animate-pulse rounded-md bg-gray-200 h-8 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-8 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-8 w-full" />
      </div>
      <div className="flex-1 p-8 space-y-4">
        <div className="animate-pulse rounded-md bg-gray-200 h-8 w-48" />
        <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
      </div>
    </div>
  );
}

// Lazy load GitHubDashboard - only needed for signed-in users
const GitHubDashboard = dynamic(
  () => import('@/components/GitHubDashboard').then(mod => ({ default: mod.GitHubDashboard })),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  }
);

export function HomeDashboard({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoading, session } = useAuthWithHint();
  const router = useRouter();
  const searchParams = useSearchParams();

  const skipOnboarding = searchParams?.get('home') === '1';
  const userCreatedAt = (session?.user as { createdAt?: string | Date } | undefined)?.createdAt;

  const isFreshSignup = useMemo(() => {
    if (!isSignedIn || skipOnboarding || !userCreatedAt) return false;
    if (hasSeenOnboarding()) return false;
    const createdMs = new Date(userCreatedAt).getTime();
    if (!Number.isFinite(createdMs)) return false;
    return Date.now() - createdMs < FRESH_SIGNUP_WINDOW_MS;
  }, [isSignedIn, skipOnboarding, userCreatedAt]);

  useEffect(() => {
    if (isFreshSignup) router.replace('/onboarding');
  }, [isFreshSignup, router]);

  if (isLoading) {
    return <div data-testid="home-dashboard">{children}</div>;
  }

  if (isFreshSignup) {
    return <div data-testid="home-dashboard"><DashboardSkeleton /></div>;
  }

  if (isSignedIn) {
    return <div data-testid="home-dashboard"><GitHubDashboard /></div>;
  }

  return <div data-testid="home-dashboard">{children}</div>;
}
