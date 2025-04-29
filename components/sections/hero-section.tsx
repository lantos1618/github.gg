"use client"

import { SlideIn } from "@/components/animated-elements"
import UrlAnimation from "@/components/url-animation"
import { useState } from "react"

export default function HeroSection() {
  const [message, setMessage] = useState("")

  return (
    <section className="flex-1 flex flex-col justify-center py-12 md:py-20 px-4 w-full mx-auto items-center text-center">
      <SlideIn direction="up" duration={0.8} className="w-full">
        <UrlAnimation />
      </SlideIn>

      {/* Hero content removed as requested */}
    </section>
  )
}
