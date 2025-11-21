'use client';

import { HeroSection } from '@/components/home';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { GitHubDashboard } from '@/components/GitHubDashboard';
import { useAuth } from '@/lib/auth/client';

export default function Home() {
  const { isSignedIn, isLoading } = useAuth();

  // Show dashboard if user is logged in
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-1 w-1 bg-black animate-ping rounded-full"></div>
      </div>
    );
  }

  if (isSignedIn) {
    return <GitHubDashboard />;
  }

  // Show landing page if not logged in
  return (
    <div className="min-h-screen bg-white selection:bg-black selection:text-white">
      <HeroSection />
      <FeatureGrid />
    </div>
  );
}
