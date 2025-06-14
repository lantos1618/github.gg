"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import { motion, useInView, useAnimation, Variants } from "framer-motion"
import { Users, Sparkles, Code2, GitFork, Star, Eye } from "lucide-react"
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, TooltipProps } from "recharts"
import { format } from "date-fns"
import { useMediaQuery } from "@/hooks/use-media-query"
// Mock tRPC client implementation
const createMockTrpcClient = (initialData: any) => ({
  stats: {
    getStats: () => ({
      useQuery: (options: any, config: any) => ({
        data: config?.initialData || initialData,
        isLoading: false,
        error: null,
      })
    })
  }
});

// Type for the error from the API
interface ApiError extends Error {
  message: string;
  code?: string;
}

// Type definitions for the stats data
interface MonthlyDataPoint {
  month: string;
  value: number;
}

interface StatsData {
  userActivity: {
    data: MonthlyDataPoint[];
    currentUsers: number;
    growthPercentage: number;
  };
  reposAnalyzed: {
    data: MonthlyDataPoint[];
    totalRepos: number;
    growthPercentage: number;
  };
  tokensUsed: {
    monthlyData: number[];
    totalTokens: number;
  };
}

// Chart data types
interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

interface ChartTooltipProps extends TooltipProps<number | string, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: Record<string, unknown>;
  }>;
  label?: string;
}

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

// Counter animation component
interface CountUpProps {
  end: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}

const CountUp: React.FC<CountUpProps> = ({
  end,
  duration = 2,
  decimals = 0,
  suffix = ""
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const controls = useAnimation();

  // Format the number with commas and add suffix
  const formatNumber = useCallback((num: number): string => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }) + (suffix ? ` ${suffix}` : '');
  }, [decimals, suffix]);

  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    let animationFrameId: number;
    const startValue = 0;
    const endValue = end;
    const startTimestamp = performance.now();
    const durationMs = duration * 1000;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Ease out function
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setCount(Number(currentValue.toFixed(decimals)));
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, duration, decimals, isInView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      {formatNumber(count)}
    </motion.div>
  );
};

// Helper hook to manage stats data
function useStatsData() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Define default stats data
  const defaultStats: StatsData = useMemo(() => ({
    userActivity: { data: [], currentUsers: 0, growthPercentage: 0 },
    reposAnalyzed: { data: [], totalRepos: 0, growthPercentage: 0 },
    tokensUsed: { monthlyData: [], totalTokens: 0 }
  }), []);

  // Initialize mock tRPC client with default data
  const trpc = useMemo(() => createMockTrpcClient(defaultStats), [defaultStats]);
  
  // Fetch stats data using tRPC
  const { data: statsData, isLoading, error } = trpc.stats.getStats().useQuery(
    { format: isMobile ? "mobile" : "full" },
    {
      refetchOnWindowFocus: false,
    }
  );
  
  // Use data with default values
  const stats = useMemo(() => statsData || defaultStats, [statsData, defaultStats]);
  
  return {
    stats,
    isLoading,
    error
  };
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  
  // Get stats data from custom hook
  const { stats, isLoading, error } = useStatsData();
  const { 
    userActivity = { data: [], currentUsers: 0, growthPercentage: 0 },
    reposAnalyzed = { data: [], totalRepos: 0, growthPercentage: 0 },
    tokensUsed = { monthlyData: [], totalTokens: 0 }
  } = stats || {};

  // Animate in when section comes into view
  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);
  
  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    
    return (
      <div className="bg-background/90 backdrop-blur-sm p-3 rounded-md border border-border shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((item, index) => {
          if (!item.value) return null;
          
          // Handle different payload structures
          const value = typeof item.value === 'number' 
            ? item.value 
            : (item as any).payload?.value ?? 0;
          const name = (item as any).name || 'Value';
          
          return (
            <p key={index} className="text-sm">
              {name}: {formatNumber(Number(value))}
            </p>
          );
        })}
      </div>
    );
  };
  
  // Render chart bars with gradient
  const renderBars = (dataKey: string, color: string) => {
    const maxValue = Math.max(...tokensUsed.monthlyData);
    const barWidth = 100 / tokensUsed.monthlyData.length;
    
    return (
      <Bar
        dataKey={dataKey}
        radius={[4, 4, 0, 0]}
        className="fill-primary"
      >
        {tokensUsed.monthlyData.map((entry: number, index: number) => {
          const height = (entry / maxValue) * 100;
          const y = 100 - height;
          const x = index * barWidth;
          
          return (
            <rect
              key={`bar-${index}`}
              x={`${x}%`}
              y={`${y}%`}
              width={`${barWidth}%`}
              height={`${height}%`}
              fill={color}
              fillOpacity={0.8}
            />
          );
        })}
      </Bar>
    );
  };

  // Generate month names for the last 6 months
  const months = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result = [];
    const date = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date);
      d.setMonth(d.getMonth() - i);
      result.push(monthNames[d.getMonth()]);
    }
    
    return result;
  }, []);

  // Format tokens for display (e.g., 1.5K, 2.3M)
  const formatTokens = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Generate data for the tokens used chart
  const tokensChartData = useMemo<Array<{name: string; tokens: number}>>(() => {
    return months.map((month: string, index: number) => ({
      name: month,
      tokens: tokensUsed.monthlyData[index] || 0,
    }));
  }, [months, tokensUsed.monthlyData]);

  // Generate data for the repos analyzed chart
  const reposChartData = useMemo<Array<{name: string; repos: number}>>(() => {
    return months.map((month: string, index: number) => ({
      name: month,
      repos: reposAnalyzed.data[index]?.value || 0,
    }));
  }, [months, reposAnalyzed.data]);

  // Generate data for the active users chart
  const usersChartData = useMemo<Array<{name: string; users: number}>>(() => {
    return months.map((month: string, index: number) => ({
      name: month,
      users: userActivity.data[index]?.value || 0,
    }));
  }, [months, userActivity.data]);

  // Format number with K/M/B suffixes
  const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

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
          <div className="text-red-400">Error loading stats: {error.message}</div>
        </div>
      </section>
    )
  }

  // Use the already extracted stats data
  const { userActivity, reposAnalyzed, tokensUsed } = stats;

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
                <Users className="h-5 w-5 text-primary" />
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
                <Sparkles className="h-5 w-5 text-primary" />
                Total Tokens Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full flex items-center justify-center">
                {/* This would be a real chart in production */}
                <div className="w-full h-full relative">
                  <div className="absolute bottom-0 left-0 w-full h-full flex items-end">
                    {tokensUsed.monthlyData.map((height: number, i: number) => (
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
                <Code2 className="h-5 w-5 text-primary" />
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
                      formatter={(value: number) => [`${(value / 1000000).toFixed(1)}M`, "Repositories"]}
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
