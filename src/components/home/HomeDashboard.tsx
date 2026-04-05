'use client';

import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth/client';
// Dashboard skeleton for signed-in users while dashboard loads
function DashboardSkeleton() {
  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background flex items-center justify-center">
      <div className="py-16 text-center text-base text-[#aaa]">Loading...</div>
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
  const { isSignedIn, isLoading } = useAuth();

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
