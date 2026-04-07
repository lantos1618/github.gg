'use client';

import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useAuthWithHint } from '@/lib/hooks/useAuthWithHint';
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
  const { isSignedIn, isLoading } = useAuthWithHint();

  // While auth is loading, show the server-rendered landing content
  if (isLoading) {
    return <div data-testid="home-dashboard">{children}</div>;
  }

  // Show dashboard for signed-in users (lazy loaded)
  if (isSignedIn) {
    return <div data-testid="home-dashboard"><GitHubDashboard /></div>;
  }

  // Show server-rendered landing content for anonymous users
  return <div data-testid="home-dashboard">{children}</div>;
}
