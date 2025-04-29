"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useInView, useAnimation } from "framer-motion"
import { UsersIcon, SparklesIcon, Code2Icon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function StatsSection() {
  // State for API data
  const [statsData, setStatsData] = useState({
    userActivity: {
      data: [],
      currentUsers: 0,
      growthPercentage: 0,
    },
    reposAnalyzed: {
      data: [],
      totalRepos: 0,
      growthPercentage: 0,
    },
    tokensUsed: {
      monthlyData: [],
      totalTokens: 0,
    },
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check if we're on mobile
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Fetch stats data from API
  useEffect(() => {
    const fetchStatsData = async () => {
      try {
        setIsLoading(true)
        const format = isMobile ? "mobile" : "full"
        const response = await fetch(`/api/stats?format=${format}`)

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`)
        }

        const data = await response.json()
        setStatsData(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching stats data:", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatsData()
  }, [isMobile])

  // Counter animation component
  function CountUp({ end, duration = 2, decimals = 0, suffix = "" }) {
    const [count, setCount] = useState(0)
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.3 })
    const controls = useAnimation()

    useEffect(() => {
      if (isInView) {
        controls.start("visible")

        let startTime
        let animationFrame

        const countUp = (timestamp) => {
          if (!startTime) startTime = timestamp
          const progress = timestamp - startTime
          const percentage = Math.min(progress / (duration * 1000), 1)

          // Easing function for smoother animation
          const easeOutQuart = 1 - Math.pow(1 - percentage, 4)
          const currentCount = Math.floor(easeOutQuart * end)

          setCount(currentCount)

          if (percentage < 1) {
            animationFrame = requestAnimationFrame(countUp)
          }
        }

        animationFrame = requestAnimationFrame(countUp)

        return () => {
          cancelAnimationFrame(animationFrame)
        }
      }
    }, [isInView, end, duration, controls])

    // Format the number with commas and decimals
    const formattedCount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(count)

    return (
      <span ref={ref}>
        {formattedCount}
        {suffix}
      </span>
    )
  }

  // Create a ref for the section
  const sectionRef = useRef(null)
  // Check if the section is in view
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  // Animation controls
  const controls = useAnimation()

  // Start animations when section comes into view
  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [isInView, controls])

  // Loading state
  if (isLoading) {
    return (
      <section className="bg-black/60 backdrop-blur-sm pt-12 md:pt-20 border-y border-border/40" ref={sectionRef}>
        <div className="container px-4 md:px-6 text-center py-20">
          <div className="animate-pulse">Loading stats data...</div>
        </div>
      </section>
    )
  }

  // Error state
  if (error) {
    return (
      <section className="bg-black/60 backdrop-blur-sm pt-12 md:pt-20 border-y border-border/40" ref={sectionRef}>
        <div className="container px-4 md:px-6 text-center py-20">
          <div className="text-red-400">Error loading stats: {error}</div>
        </div>
      </section>
    )
  }

  // Extract data from the API response
  const { userActivity, reposAnalyzed, tokensUsed } = statsData

  return (
    <section className="bg-black/60 backdrop-blur-sm pt-12 md:pt-20 border-y border-border/40" ref={sectionRef}>
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12">
          <motion.div
            initial="hidden"
            animate={controls}
            variants={{
              hidden: { opacity: 0, y: -20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-4" variant="outline">
              Platform Stats
            </Badge>
          </motion.div>
          <motion.h2
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4"
            initial="hidden"
            animate={controls}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Growing Community
          </motion.h2>
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-[600px] mx-auto"
            initial="hidden"
            animate={controls}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Join thousands of developers already using GitHub.GG
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-[1200px] mx-auto">
          {/* Active Users Card with Graph */}
          <Card className="bg-black/80 border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <UsersIcon className="h-5 w-5 text-primary" />
                Active Users This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={userActivity.data}>
                    <defs>
                      <linearGradient id="userColorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#userColorGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col items-center">
                <motion.div
                  className="text-3xl md:text-5xl font-bold mb-2"
                  initial="hidden"
                  animate={controls}
                  variants={{
                    hidden: { opacity: 0, scale: 0.5 },
                    visible: { opacity: 1, scale: 1 },
                  }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                >
                  <CountUp end={userActivity.currentUsers} duration={2.5} />
                </motion.div>
                <motion.p
                  className="text-sm md:text-base text-muted-foreground"
                  initial="hidden"
                  animate={controls}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1 },
                  }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="text-green-400">↑ {userActivity.growthPercentage}%</span> from last month
                </motion.p>
              </div>
            </CardContent>
          </Card>

          {/* Token Usage Card */}
          <Card className="bg-black/80 border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <SparklesIcon className="h-5 w-5 text-primary" />
                Total Tokens Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full flex items-center justify-center">
                {/* This would be a real chart in production */}
                <div className="w-full h-full relative">
                  <div className="absolute bottom-0 left-0 w-full h-full flex items-end">
                    {tokensUsed.monthlyData.map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 mx-0.5 bg-gradient-to-t from-primary/80 to-primary/30 rounded-t"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-border"></div>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground overflow-x-auto">
                <span className="px-1">Jan</span>
                <span className="px-1">Feb</span>
                <span className="px-1">Mar</span>
                <span className="px-1">Apr</span>
                <span className="px-1">May</span>
                <span className="px-1">Jun</span>
                <span className="px-1">Jul</span>
                <span className="px-1">Aug</span>
                <span className="px-1">Sep</span>
                <span className="px-1">Oct</span>
                <span className="px-1">Nov</span>
                <span className="px-1">Dec</span>
              </div>
              <div className="text-center mt-4">
                <motion.div
                  className="text-2xl md:text-3xl font-bold"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
                >
                  <CountUp end={tokensUsed.totalTokens} decimals={1} suffix="B+" duration={2} />
                </motion.div>
                <motion.p
                  className="text-xs md:text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Total tokens processed in 2024
                </motion.p>
              </div>
            </CardContent>
          </Card>

          {/* Repositories Analyzed Card with Graph */}
          <Card className="bg-black/80 border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Code2Icon className="h-5 w-5 text-primary" />
                Repositories Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reposAnalyzed.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }}
                      labelStyle={{ color: "#fff" }}
                      formatter={(value) => [`${(value / 1000000).toFixed(1)}M`, "Repositories"]}
                    />
                    <Bar dataKey="repos" fill="#ff6b81" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col items-center">
                <motion.div
                  className="text-3xl md:text-5xl font-bold mb-2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
                >
                  <CountUp end={reposAnalyzed.totalRepos / 1000000} decimals={1} suffix="M+" duration={2.5} />
                </motion.div>
                <motion.p
                  className="text-sm md:text-base text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <span className="text-green-400">↑ {reposAnalyzed.growthPercentage}%</span> from last month
                </motion.p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
