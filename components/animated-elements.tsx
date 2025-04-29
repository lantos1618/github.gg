"use client"

import type { ReactNode } from "react"
import { motion, type MotionProps, type Variants } from "framer-motion"
import { useEffect, useState } from "react"

// Wrapper to ensure client-side only rendering
function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <>{children}</>
}

// Fade in animation
export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
  ...props
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
} & MotionProps) {
  return (
    <ClientOnly>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration, ease: "easeOut" }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </ClientOnly>
  )
}

// Staggered children animation
export function StaggerContainer({
  children,
  delay = 0,
  staggerChildren = 0.1,
  className = "",
  ...props
}: {
  children: ReactNode
  delay?: number
  staggerChildren?: number
  className?: string
} & MotionProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren: delay,
      },
    },
  }

  return (
    <ClientOnly>
      <motion.div variants={containerVariants} initial="hidden" animate="show" className={className} {...props}>
        {children}
      </motion.div>
    </ClientOnly>
  )
}

// Staggered item animation
export function StaggerItem({
  children,
  className = "",
  ...props
}: {
  children: ReactNode
  className?: string
} & MotionProps) {
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  }

  return (
    <ClientOnly>
      <motion.div variants={itemVariants} className={className} {...props}>
        {children}
      </motion.div>
    </ClientOnly>
  )
}

// Slide in animation
export function SlideIn({
  children,
  direction = "left",
  delay = 0,
  duration = 0.5,
  className = "",
  ...props
}: {
  children: ReactNode
  direction?: "left" | "right" | "up" | "down"
  delay?: number
  duration?: number
  className?: string
} & MotionProps) {
  const directionMap = {
    left: { x: -100, y: 0 },
    right: { x: 100, y: 0 },
    up: { x: 0, y: -100 },
    down: { x: 0, y: 100 },
  }

  return (
    <ClientOnly>
      <motion.div
        initial={{ opacity: 0, ...directionMap[direction] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay, duration, type: "spring", stiffness: 100, damping: 20 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </ClientOnly>
  )
}

// Scale animation
export function ScaleIn({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
  ...props
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
} & MotionProps) {
  return (
    <ClientOnly>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration, type: "spring", stiffness: 200, damping: 20 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </ClientOnly>
  )
}

// Hover animation for cards and buttons
export function HoverElement({
  children,
  className = "",
  ...props
}: {
  children: ReactNode
  className?: string
} & MotionProps) {
  return (
    <ClientOnly>
      <motion.div
        whileHover={{
          scale: 1.03,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          transition: { duration: 0.2 },
        }}
        whileTap={{ scale: 0.98 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </ClientOnly>
  )
}

// Text reveal animation
export function TextReveal({
  children,
  delay = 0,
  staggerChildren = 0.02,
  className = "",
  ...props
}: {
  children: string
  delay?: number
  staggerChildren?: number
  className?: string
} & MotionProps) {
  const text = children.split("")

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren: delay,
      },
    },
  }

  const childVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", damping: 12, stiffness: 200 },
    },
  }

  return (
    <ClientOnly>
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`inline-block ${className}`}
        {...props}
      >
        {text.map((char, index) => (
          <motion.span key={index} variants={childVariants} className="inline-block">
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.span>
    </ClientOnly>
  )
}
