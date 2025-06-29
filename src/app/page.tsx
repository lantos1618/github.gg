'use client';

import { HeroSection, RoadmapSection } from '@/components/home';
import { roadmapItems } from '@/data/roadmap';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <RoadmapSection items={roadmapItems} />
    </main>
  );
}
