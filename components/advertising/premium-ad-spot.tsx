"use client"

import { useState } from "react"
import Image from "next/image"
import { ExternalLinkIcon, InfoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PremiumAdSpotProps {
  className?: string
  variant?: "standard" | "minimal" | "featured"
}

export default function PremiumAdSpot({ className = "", variant = "standard" }: PremiumAdSpotProps) {
  const [adMetricsVisible, setAdMetricsVisible] = useState(false)

  // This would be replaced with actual ad content from your ad server
  // For now, we're using a placeholder ad for GitHub Copilot
  const adContent = {
    advertiser: "GitHub",
    title: "Supercharge your coding with GitHub Copilot",
    description: "AI pair programming that helps you write better code, faster. Try it free for 30 days.",
    cta: "Try Copilot Free",
    link: "https://github.com/features/copilot",
    imageUrl: "/placeholder.svg?height=200&width=400",
    backgroundColor: "bg-gradient-to-r from-purple-900/40 to-blue-900/40",
    borderColor: "border-blue-500/30",
  }

  // Different styling based on variant
  const variantStyles = {
    standard: "p-4 rounded-lg",
    minimal: "p-3 rounded-md",
    featured: "p-5 rounded-xl shadow-lg shadow-blue-500/10",
  }

  return (
    <div
      className={`relative border ${adContent.backgroundColor} ${adContent.borderColor} ${variantStyles[variant]} ${className}`}
    >
      {/* Ad Label */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
        <span className="text-xs bg-gray-800/80 text-gray-300 px-1.5 py-0.5 rounded">Premium Partner</span>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setAdMetricsVisible(!adMetricsVisible)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <InfoIcon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Premium advertising spot</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Ad Metrics Popup (would be admin-only in production) */}
      {adMetricsVisible && (
        <div className="absolute right-2 top-8 bg-gray-900 border border-gray-700 rounded-md p-3 z-20 shadow-xl w-[200px]">
          <h4 className="text-xs font-medium mb-2">Ad Performance</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Impressions:</span>
              <span>24,738</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Clicks:</span>
              <span>1,249</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">CTR:</span>
              <span>5.05%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Revenue:</span>
              <span className="text-green-400">$10,000</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* Ad Image */}
        <div className="w-full md:w-1/3 flex-shrink-0">
          <div className="relative rounded-md overflow-hidden aspect-video">
            <Image
              src={adContent.imageUrl || "/placeholder.svg"}
              alt={`Advertisement for ${adContent.advertiser}`}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Ad Content */}
        <div className="w-full md:w-2/3 flex flex-col">
          <h3 className="text-lg md:text-xl font-semibold mb-2">{adContent.title}</h3>
          <p className="text-sm text-gray-300 mb-4">{adContent.description}</p>

          <div className="mt-auto flex items-center justify-between">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <a href={adContent.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                {adContent.cta}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            </Button>

            <span className="text-xs text-gray-400">Sponsored by {adContent.advertiser}</span>
          </div>
        </div>
      </div>

      {/* Your Ad Here - Contact Info (only visible to admins or when no ad is active) */}
      {false && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
          <div className="text-center p-6">
            <h3 className="text-xl font-bold mb-2">Premium Ad Space</h3>
            <p className="text-gray-300 mb-4">$10,000/month - Reach 100k+ developers daily</p>
            <Button variant="outline">Contact for Advertising</Button>
          </div>
        </div>
      )}
    </div>
  )
}
