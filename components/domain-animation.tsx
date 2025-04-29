"use client"

import { useSpring, animated, config } from "react-spring"
import { useState, useEffect, useRef } from "react"

// Define animation states as an enum for better type safety and readability
enum AnimationState {
  NORMAL = "normal",
  STRIKETHROUGH = "strikethrough",
  GG = "gg",
}

export default function DomainAnimation() {
  // Use a single state variable with the enum instead of multiple booleans
  const [animationState, setAnimationState] = useState<AnimationState>(AnimationState.NORMAL)
  const [currentRepo, setCurrentRepo] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // List of GitHub repositories to cycle through
  const githubRepos = [
    "preactjs/preact",
    "solidjs/solid",
    "sveltejs/svelte",
    "tinyplex/tinybase",
    "bigskysoftware/htmx",
  ]

  // Animation for the .com text - moves up when exiting with enhanced tweening
  const comSpringProps = useSpring({
    opacity: animationState === AnimationState.GG ? 0 : 1,
    transform: animationState === AnimationState.GG ? "translateY(-20px)" : "translateY(0px)",
    config: {
      tension: 180,
      friction: 24,
      mass: 1.2,
    }, // Smoother animation
  })

  // Animation for the .gg text - comes from above with enhanced tweening
  const ggSpringProps = useSpring({
    opacity: animationState === AnimationState.GG ? 1 : 0,
    transform: animationState === AnimationState.GG ? "translateY(0px)" : "translateY(-20px)",
    config: {
      tension: 180,
      friction: 24,
      mass: 1.2,
    }, // Smoother animation
  })

  // Animation for the repository text
  const repoSpringProps = useSpring({
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    reset: true,
    config: config.gentle,
    delay: 200,
    key: currentRepo, // This ensures the animation reruns when the repo changes
  })

  // Auto-play animation with adjusted timing
  useEffect(() => {
    // Stage durations (in milliseconds)
    const normalStageDuration = 800 // 800ms for normal stage
    const strikethroughStageDuration = 800 // 800ms for strikethrough stage
    const ggStageDuration = 1600 // 1600ms for .gg stage (double time)

    // Define the animation steps
    const runAnimationCycle = () => {
      // Stage 1: Show .com normally
      setAnimationState(AnimationState.NORMAL)

      // Stage 2: Apply strikethrough to .com
      setTimeout(() => {
        setAnimationState(AnimationState.STRIKETHROUGH)
      }, normalStageDuration)

      // Stage 3: Transition to .gg
      setTimeout(() => {
        setAnimationState(AnimationState.GG)
      }, normalStageDuration + strikethroughStageDuration)

      // After completing a full cycle, change the repo
      setTimeout(
        () => {
          setCurrentRepo((prev) => (prev + 1) % githubRepos.length)
        },
        normalStageDuration + strikethroughStageDuration + ggStageDuration,
      )
    }

    // Run the animation immediately on first render
    runAnimationCycle()

    // Set up the interval to repeat the animation
    const totalCycleDuration = normalStageDuration + strikethroughStageDuration + ggStageDuration
    const timer = setInterval(() => {
      runAnimationCycle()
    }, totalCycleDuration)

    return () => clearInterval(timer)
  }, [githubRepos.length])

  return (
    <div className="text-6xl md:text-8xl font-bold flex items-center" ref={containerRef}>
      {/* Fixed GitHub text */}
      <span className="flex-shrink-0">GitHub</span>

      {/* Container for the animated parts with fixed position */}
      <div className="relative h-20 overflow-visible" style={{ minWidth: "400px" }}>
        {/* .com version with path */}
        <animated.div style={comSpringProps} className="absolute left-0 top-0 flex items-center whitespace-nowrap">
          <span
            className="text-white/80"
            style={{
              textDecoration:
                animationState === AnimationState.STRIKETHROUGH || animationState === AnimationState.GG
                  ? "line-through"
                  : "none",
              textDecorationColor:
                animationState === AnimationState.STRIKETHROUGH || animationState === AnimationState.GG
                  ? "#ef4444"
                  : "transparent",
              textDecorationThickness: "4px",
              transition: "text-decoration-color 0.3s ease",
            }}
          >
            .com
          </span>
          <animated.span style={repoSpringProps} className="text-white/80">
            /{githubRepos[currentRepo]}
          </animated.span>
        </animated.div>

        {/* .gg version with path */}
        <animated.div style={ggSpringProps} className="absolute left-0 top-0 flex items-center whitespace-nowrap">
          <span className="text-primary">.gg</span>
          <animated.span style={repoSpringProps} className="text-white/80">
            /{githubRepos[currentRepo]}
          </animated.span>
        </animated.div>
      </div>
    </div>
  )
}
