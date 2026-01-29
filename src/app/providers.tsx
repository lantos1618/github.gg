'use client'

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { posthogInstance, getPostHog } from '@/lib/analytics/posthog'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const posthog = getPostHog()
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Get PostHog instance (lazy init on mount)
  const ph = posthogInstance();

  // Only render PostHog provider if PostHog is properly configured
  if (!ph) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={ph}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  )
} 