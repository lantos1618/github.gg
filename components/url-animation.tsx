"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

// Define animation stages
enum Stage {
  COM = 0,
  COM_STRIKE = 1,
  GG = 2,
}

export default function UrlAnimation() {
  const [mounted, setMounted] = useState(false)
  const [stage, setStage] = useState<Stage>(Stage.COM)
  const [currentRepoIndex, setCurrentRepoIndex] = useState(0)

  // List of GitHub repositories to cycle through
  const repos = [
    "preactjs/preact",
    "karpathy/micrograd",
    "bigskysoftware/htmx",
    "tinyplex/tinybase",
    "developit/mitt",
    "sindresorhus/ky",
    "lukeed/clsx",
    "ai/nanoid",
    "jamiebuilds/the-super-tiny-compiler",
  ]

  // Ensure client-side rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Animation sequence timing
  useEffect(() => {
    if (!mounted) return

    const timer = setInterval(() => {
      setStage((prevStage) => {
        // When transitioning from GG back to COM, change the repo
        if (prevStage === Stage.GG) {
          setCurrentRepoIndex((prev) => (prev + 1) % repos.length)
        }
        return ((prevStage + 1) % 3) as Stage
      })
    }, 1500) // Reduced from 2000ms to 1500ms for faster overall animation

    return () => clearInterval(timer)
  }, [repos.length, mounted])

  if (!mounted) return null

  // Animation variants
  const comVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 500, damping: 30 },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.2 },
    },
  }

  const ggVariants = {
    initial: { opacity: 0, y: -50, rotateX: 90 },
    animate: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        mass: 1.2,
      },
    },
    exit: {
      opacity: 0,
      y: 30,
      transition: { duration: 0.3 },
    },
  }

  const repoVariants = {
    initial: { opacity: 0, x: -10 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 500, damping: 30 },
    },
    exit: {
      opacity: 0,
      x: 10,
      transition: { duration: 0.2 },
    },
  }

  return (
    <div className="flex flex-col items-start gap-6 w-full max-w-3xl mx-auto">
      {/* Main URL display with fixed width container and left alignment */}
      <div className="flex flex-col items-start w-full px-6 py-4">
        <Link
          href={`/${repos[currentRepoIndex]}`}
          className="flex text-4xl md:text-5xl font-mono font-bold overflow-hidden cursor-pointer relative group mb-2"
          aria-label={`Visit github.gg/${repos[currentRepoIndex]}`}
        >
          {/* White underline animation for the URL */}
          <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full"></span>

          {/* Static part */}
          <span className="text-white flex-shrink-0">github</span>

          {/* Container for domain with fixed width to prevent layout shifts */}
          <div className="w-[100px] md:w-[120px] relative h-[60px]">
            {/* Animated domain extension - only swap between .com and .gg */}
            <AnimatePresence mode="wait">
              {stage === Stage.GG ? (
                <motion.span
                  key="gg"
                  variants={ggVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="text-primary absolute left-0"
                  style={{
                    display: "inline-block",
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                    padding: "0 2px 6px 0", // Increased bottom padding
                    marginBottom: "4px", // Increased bottom margin
                    width: "auto",
                    minWidth: "100%",
                    position: "relative", // Add relative positioning
                    top: "-2px", // Shift up slightly to prevent bottom cutoff
                  }}
                >
                  .gg
                </motion.span>
              ) : (
                <motion.span
                  key="com"
                  variants={comVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={`${stage === Stage.COM_STRIKE ? "text-red-500" : "text-gray-400"} transition-colors duration-300 absolute left-0`}
                  data-strikethrough={stage === Stage.COM_STRIKE ? "true" : "false"}
                  style={{
                    padding: "0 2px 6px 0", // Increased bottom padding
                    marginBottom: "4px", // Increased bottom margin
                    position: "relative", // Add relative positioning
                    top: "-2px", // Shift up slightly to prevent bottom cutoff
                  }}
                >
                  <span
                    className={`${
                      stage === Stage.COM_STRIKE
                        ? "line-through decoration-red-500 decoration-[3px] text-red-500"
                        : "text-gray-400"
                    } transition-all duration-300 ease-in-out relative`}
                    style={{
                      textDecorationColor: stage === Stage.COM_STRIKE ? "#ef4444" : "transparent",
                    }}
                  >
                    .com
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Repository path with overflow handling */}
          <div className="max-w-[300px] md:max-w-[400px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentRepoIndex}
                variants={repoVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`${stage === Stage.GG ? "text-green-300" : "text-gray-300"} whitespace-nowrap overflow-hidden text-ellipsis block`}
              >
                /{repos[currentRepoIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </Link>
      </div>
    </div>
  )
}
