"use client"

import type { ReactNode } from "react"
import { ExternalLinkIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdBannerProps {
  title: string
  description: string
  ctaText: string
  ctaLink?: string
  icon?: ReactNode
  variant?: "primary" | "secondary" | "subtle"
  onDismiss?: () => void
  className?: string
}

export default function AdBanner({
  title,
  description,
  ctaText,
  ctaLink = "#",
  icon,
  variant = "primary",
  onDismiss,
  className = "",
}: AdBannerProps) {
  // Define styles based on variant
  const variantStyles = {
    primary: "bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30",
    secondary: "bg-gradient-to-r from-purple-500/20 to-purple-500/5 border-purple-500/30",
    subtle: "bg-gray-800/50 border-gray-700/50",
  }

  return (
    <div className={`relative rounded-lg border p-4 ${variantStyles[variant]} ${className}`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50"
          aria-label="Dismiss advertisement"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        {icon && <div className="flex-shrink-0 mt-1">{icon}</div>}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{title}</h4>
            <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">Ad</span>
          </div>

          <p className="text-sm text-gray-300 mb-3">{description}</p>

          <Button
            size="sm"
            variant={variant === "primary" ? "default" : "outline"}
            className={variant === "primary" ? "bg-primary hover:bg-primary/90" : ""}
            asChild
          >
            <a href={ctaLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
              {ctaText}
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
