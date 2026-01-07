'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { HeroSection, FeatureGrid, CallToAction } from '@/components/home';
import { useAuth } from '@/lib/auth/client';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load GitHubDashboard - only needed for signed-in users
const GitHubDashboard = dynamic(
  () => import('@/components/GitHubDashboard').then(mod => ({ default: mod.GitHubDashboard })),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  }
);

// Landing page skeleton - shown briefly while auth resolves
function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="relative bg-white overflow-hidden min-h-[80vh] flex flex-col justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Skeleton className="h-24 md:h-32 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-2/3 mx-auto" />
            <div className="max-w-xl mx-auto">
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
            <div className="flex justify-center gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard skeleton for signed-in users while dashboard loads
function DashboardSkeleton() {
  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background flex">
      {/* Left sidebar skeleton */}
      <div className="w-64 border-r bg-background p-4 space-y-4 hidden lg:block">
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-8 space-y-6">
        {/* PR section */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl border">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>

        {/* Issues section */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl border">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar skeleton */}
      <div className="w-80 border-l bg-background p-4 space-y-4 hidden lg:block">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isSignedIn, isLoading } = useAuth();

  // Show landing page skeleton while auth is loading
  // This is fast and shows meaningful content immediately
  if (isLoading) {
    return <LandingPageSkeleton />;
  }

  // Show dashboard for signed-in users (lazy loaded)
  if (isSignedIn) {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <GitHubDashboard />
      </Suspense>
    );
  }

  // Show landing page for anonymous users
  return (
    <div className="min-h-screen bg-white selection:bg-black selection:text-white">
      <HeroSection />
      <FeatureGrid />
      <CallToAction />
    </div>
  );
}
