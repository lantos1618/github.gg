'use client';

import { HeroSection, RoadmapSection } from '@/components/home';
import { roadmapItems } from '@/data/roadmap';

export default function Home() {
  return (
    <div className="min-h-screen bg-white pt-14">
      <HeroSection />
      <RoadmapSection items={roadmapItems} />
    </div>
  );
}
