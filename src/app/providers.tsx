'use client'

import { useEffect } from "react"
import { posthogInstance } from '@/lib/analytics/posthog'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // PostHog is now initialized in the posthog.ts file
    // This effect is mainly for any additional setup if needed
  }, [])

  // Only render PostHog provider if PostHog is properly configured
  if (!posthogInstance) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthogInstance}>
      {children}
    </PHProvider>
  )
} 