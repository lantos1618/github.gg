"use client"

import { useEffect, useRef } from "react"

export default function DynamicGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Grid properties - define these BEFORE they're used
    const gridSize = 50
    const smallGridSize = 10
    const lineWidth = 0.5
    const smallLineWidth = 0.2

    // Animation properties
    let animationFrame: number
    let time = 0

    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      drawGrid()
    }

    // Initial resize
    resizeCanvas()

    // Handle window resize
    window.addEventListener("resize", resizeCanvas)

    function drawGrid() {
      if (!ctx || !canvas) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.8,
      )
      gradient.addColorStop(0, "rgba(255, 200, 255, 0.03)")
      gradient.addColorStop(1, "rgba(255, 150, 200, 0.01)")

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw large grid
      ctx.beginPath()
      ctx.strokeStyle = "rgba(255, 100, 150, 0.07)"
      ctx.lineWidth = lineWidth

      // Vertical lines with variation
      for (let x = 0; x < canvas.width; x += gridSize) {
        const xOffset = Math.sin(x * 0.01 + time * 0.1) * 2
        ctx.moveTo(x + xOffset, 0)
        ctx.lineTo(x + xOffset + Math.sin(x * 0.005) * 5, canvas.height)
      }

      // Horizontal lines with variation
      for (let y = 0; y < canvas.height; y += gridSize) {
        const yOffset = Math.cos(y * 0.01 + time * 0.1) * 2
        ctx.moveTo(0, y + yOffset)
        ctx.lineTo(canvas.width, y + yOffset + Math.sin(y * 0.005) * 5)
      }

      ctx.stroke()

      // Draw smaller grid with different opacity
      ctx.beginPath()
      ctx.strokeStyle = "rgba(255, 100, 150, 0.03)"
      ctx.lineWidth = smallLineWidth

      // Vertical small lines
      for (let x = 0; x < canvas.width; x += smallGridSize) {
        if (x % gridSize !== 0) {
          // Don't draw where large grid lines are
          ctx.moveTo(x, 0)
          ctx.lineTo(x, canvas.height)
        }
      }

      // Horizontal small lines
      for (let y = 0; y < canvas.height; y += smallGridSize) {
        if (y % gridSize !== 0) {
          // Don't draw where large grid lines are
          ctx.moveTo(0, y)
          ctx.lineTo(canvas.width, y)
        }
      }

      ctx.stroke()

      // Add some glowing points at intersections
      const numPoints = 20
      for (let i = 0; i < numPoints; i++) {
        const x = Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize
        const y = Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize

        const glow = ctx.createRadialGradient(x, y, 0, x, y, 20 + Math.sin(time * 0.5 + i) * 10)
        glow.addColorStop(0, "rgba(255, 150, 200, 0.15)")
        glow.addColorStop(1, "rgba(255, 150, 200, 0)")

        ctx.fillStyle = glow
        ctx.fillRect(x - 20, y - 20, 40, 40)
      }

      // Add subtle noise texture
      addNoiseTexture(ctx, canvas.width, canvas.height, 0.01)
    }

    function addNoiseTexture(ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number) {
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255
        data[i] = Math.min(data[i] + noise * alpha, 255)
        data[i + 1] = Math.min(data[i + 1] + noise * alpha, 255)
        data[i + 2] = Math.min(data[i + 2] + noise * alpha, 255)
      }

      ctx.putImageData(imageData, 0, 0)
    }

    function animate() {
      time += 0.01
      drawGrid()
      animationFrame = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none" />
}
