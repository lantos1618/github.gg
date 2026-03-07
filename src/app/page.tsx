import { HeroSection, FeatureGrid, CallToAction } from '@/components/home';
import { HomeDashboard } from '@/components/home/HomeDashboard';

export default function Home() {
  return (
    <HomeDashboard>
      <div className="min-h-screen bg-white selection:bg-black selection:text-white">
        <HeroSection />
        <FeatureGrid />
        <CallToAction />
      </div>
    </HomeDashboard>
  );
}
