'use client';

import { HeroSection, FeaturesTimeline } from '@/components/home';
import { features } from '@/data/features';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <FeaturesTimeline features={features} />
    </div>
  );
}
