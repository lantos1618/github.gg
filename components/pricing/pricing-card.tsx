"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SparklesIcon, RocketIcon, ExternalLinkIcon, GithubIcon } from "lucide-react"
import { motion } from "framer-motion"
import { useEmailModal } from "@/components/email-modal-provider"
import { useState } from "react"
import { useRouter } from "next/navigation"

export interface PricingFeature {
  text: string
  icon?: ReactNode
}

export interface PricingCardProps {
  title: string | ReactNode
  price: string
  priceDetail?: string
  description: string
  features: (PricingFeature | string)[]
  buttonText: string
  buttonVariant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link" | null
  buttonAction?: () => void
  badge?: {
    text: string
    className?: string
  }
  className?: string
  iconColor?: string
  isUltra?: boolean
  planType: "free" | "pro" | "ultra" | "team" | "enterprise"
}

export default function PricingCard({
  title,
  price,
  priceDetail,
  description,
  features,
  buttonText,
  buttonVariant = "default",
  buttonAction,
  badge,
  className = "",
  iconColor = "text-primary",
  isUltra = false,
  planType,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Use try/catch to handle the case when EmailModalProvider is not available
  const emailModalContext = useEmailModal()
  const { openModal } = emailModalContext

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use client-side navigation instead of API route
      router.push("/github-login")
    } catch (err) {
      console.error("Error during GitHub login:", err)
      setError("Failed to navigate to login page. Please try again.")
      setIsLoading(false)
    }
  }

  const handleClick = () => {
    if (planType === "free") {
      handleGitHubLogin()
    } else if (buttonAction) {
      buttonAction()
    } else if (openModal) {
      openModal(planType)
    } else {
      console.log("No action available for this button")
    }
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Card className={`bg-background border-border relative overflow-hidden flex flex-col min-h-[600px] ${className}`}>
        {badge && (
          <div className="absolute top-0 right-0">
            <div
              className={`text-xs font-medium px-3 py-1 transform rotate-0 origin-top-right ${badge.className || "bg-primary text-primary-foreground"}`}
            >
              {badge.text}
            </div>
          </div>
        )}
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <div className="mt-4 mb-2 flex items-baseline">
            <span className="text-3xl md:text-4xl font-bold">{price}</span>
            {priceDetail && <span className="text-sm text-muted-foreground ml-1">{priceDetail}</span>}
            {!priceDetail && price !== "Custom" && <span className="text-sm text-muted-foreground ml-1">/month</span>}
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-2 flex-grow">
          <ul className="space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {typeof feature === "string" ? (
                    <SparklesIcon className={`h-3 w-3 ${iconColor}`} />
                  ) : (
                    feature.icon || <SparklesIcon className={`h-3 w-3 ${iconColor}`} />
                  )}
                </div>
                <span className={typeof feature === "string" ? "text-muted-foreground" : ""}>
                  {typeof feature === "string" ? feature : feature.text}
                </span>
              </li>
            ))}
          </ul>

          {error && (
            <div className="mt-4 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">{error}</div>
          )}
        </CardContent>
        <CardFooter className="pt-6 mt-auto">
          <Button
            className={`w-full font-bold tracking-wide ${
              isUltra
                ? "border-2 border-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                : ""
            }`}
            variant={buttonVariant as any}
            onClick={handleClick}
            disabled={isLoading}
          >
            <div className="flex items-center justify-center gap-2 w-full">
              {planType === "free" ? (
                <>
                  <GithubIcon className="h-4 w-4" />
                  <span>{isLoading ? "Connecting..." : "Sign in with GitHub"}</span>
                </>
              ) : isUltra ? (
                <div className="flex items-center justify-center gap-2 relative">
                  <RocketIcon className="h-4 w-4" />
                  <span>Get Ultra Access</span>
                </div>
              ) : (
                <>
                  <span>{buttonText}</span>
                  <ExternalLinkIcon className="h-4 w-4" />
                </>
              )}
            </div>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
