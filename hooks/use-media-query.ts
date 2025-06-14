"use client"

import { useState, useEffect } from "react"

/**
 * A custom hook that returns whether the current viewport matches the given media query
 * @param query - The media query to match against (e.g., '(max-width: 768px)')
 * @returns boolean - Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      return
    }

    const media = window.matchMedia(query)

    // Initial check
    setMatches(media.matches)


    // Update matches when the media query changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    media.addEventListener("change", listener)


    // Clean up
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [query])

  return matches
}

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * A custom hook that returns whether the current viewport is mobile-sized
 * @returns boolean - Whether the viewport is mobile-sized
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}
