"use client"

import HeroSection from "@/components/sections/hero-section"
import FeaturesSection from "@/components/sections/features-section"
import RepoAnalysisSection from "@/components/sections/repo-analysis-section"
import StatsSection from "@/components/sections/stats-section"
import PricingSection from "@/components/sections/pricing-section"
import CTASection from "@/components/sections/cta-section"
import { FadeIn } from "@/components/animated-elements"
import AnimatedBackground from "@/components/animated-background"
import { useEffect, useState } from "react"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-black relative">
        {/* Animated background */}
        <AnimatedBackground />

        {/* Content wrapper with higher z-index */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <FadeIn>
            <HeroSection />
          </FadeIn>
          <FadeIn delay={0.2}>
            <FeaturesSection />
          </FadeIn>
          <FadeIn delay={0.3}>
            <RepoAnalysisSection />
          </FadeIn>
          <FadeIn delay={0.4}>
            <StatsSection />
          </FadeIn>
          <FadeIn delay={0.5}>
            <PricingSection />
          </FadeIn>
          <FadeIn delay={0.6}>
            <CTASection />
          </FadeIn>
        </div>
      </div>
  )
}
