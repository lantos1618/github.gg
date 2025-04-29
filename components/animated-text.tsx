"use client"

import { useSpring, animated } from "react-spring"
import { useState, useEffect } from "react"

export default function AnimatedText({ text }: { text: string }) {
  const [isGreen, setIsGreen] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [showNormal, setShowNormal] = useState(true)
  const [showGreen, setShowGreen] = useState(false)

  // Animation for the normal text - moves up when exiting
  const normalSpringProps = useSpring({
    opacity: showNormal ? 1 : 0,
    transform: showNormal ? "translateY(0px)" : "translateY(-20px)",
    config: { tension: 240, friction: 28 },
  })

  // Animation for the green text - comes from above
  const greenSpringProps = useSpring({
    opacity: showGreen ? 1 : 0,
    transform: showGreen ? "translateY(0px)" : "translateY(-20px)",
    config: { tension: 240, friction: 28 },
  })

  // Auto-play animation with adjusted timing
  useEffect(() => {
    // Stage durations (in milliseconds)
    const normalStageDuration = 500 // 500ms for normal stage
    const strikethroughStageDuration = 500 // 500ms for strikethrough stage
    const greenStageDuration = 1000 // 1000ms for green stage (double time)

    // Define the animation steps
    const runAnimationCycle = () => {
      // Stage 1: Show text normally (ensure reset)
      setShowNormal(true)
      setShowGreen(false)
      setIsStrikethrough(false)

      // Stage 2: Apply strikethrough
      setTimeout(() => {
        setIsStrikethrough(true)
      }, normalStageDuration)

      // Stage 3: Transition to green text
      setTimeout(() => {
        setShowNormal(false)
        setShowGreen(true)
      }, normalStageDuration + strikethroughStageDuration)
    }

    // Run the animation immediately on first render
    runAnimationCycle()

    // Set up the interval to repeat the animation
    const totalCycleDuration = normalStageDuration + strikethroughStageDuration + greenStageDuration // 500ms + 500ms + 1000ms = 2000ms
    const timer = setInterval(() => {
      runAnimationCycle()
    }, totalCycleDuration)

    return () => clearInterval(timer)
  }, [])

  return (
    <span className="relative inline-block">
      {/* Normal/strikethrough text */}
      <animated.span style={normalSpringProps} className="absolute left-0 text-muted-foreground">
        <span
          style={{
            textDecoration: isStrikethrough ? "line-through" : "none",
            textDecorationColor: isStrikethrough ? "#ef4444" : "transparent",
          }}
        >
          {text}
        </span>
      </animated.span>

      {/* Green text */}
      <animated.span style={greenSpringProps} className="absolute left-0 text-primary">
        {text}
      </animated.span>

      {/* Invisible text to maintain spacing */}
      <span className="invisible">{text}</span>
    </span>
  )
}
