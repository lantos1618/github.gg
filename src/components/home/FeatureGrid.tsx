'use client';

import { BarChart3, Network, FileText, Shield, Zap, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type AnimationDirection = 'left' | 'right' | 'bottom';

const features: {
  icon: typeof BarChart3;
  title: string;
  description: string;
  className: string;
  bg: string;
  animateFrom: AnimationDirection;
}[] = [
  {
    icon: BarChart3,
    title: "Scorecards",
    description: "Instant health check on code quality and complexity. Get a grade for every file.",
    className: "md:col-span-2 md:row-span-2",
    bg: "bg-blue-50/50",
    animateFrom: "left"
  },
  {
    icon: Network,
    title: "Interactive Diagrams",
    description: "Visualize dependencies, class hierarchies, and data flow automatically.",
    className: "md:col-span-1 md:row-span-2",
    bg: "bg-purple-50/50",
    animateFrom: "right"
  },
  {
    icon: Bot,
    title: "Slop Detector",
    description: "Identify low-quality AI-generated code patterns.",
    className: "md:col-span-1 md:row-span-1",
    bg: "bg-gray-50/50",
    animateFrom: "bottom"
  },
  {
    icon: Shield,
    title: "Security Scan",
    description: "Spot vulnerabilities before production.",
    className: "md:col-span-1 md:row-span-1",
    bg: "bg-gray-50/50",
    animateFrom: "bottom"
  },
  {
    icon: FileText,
    title: "Instant Wiki",
    description: "Turn your repo into a searchable documentation site.",
    className: "md:col-span-1 md:row-span-1",
    bg: "bg-gray-50/50",
    animateFrom: "bottom"
  },
  {
    icon: Zap,
    title: "AI Reviews",
    description: "Automated code reviews on every Pull Request.",
    className: "md:col-span-3 md:row-span-1",
    bg: "bg-emerald-50/50",
    animateFrom: "left"
  }
];

// Animation variants for different directions
const getAnimationVariants = (direction: AnimationDirection) => {
  const offsets = {
    left: { x: -100, y: 0 },
    right: { x: 100, y: 0 },
    bottom: { x: 0, y: 80 }
  };

  return {
    hidden: {
      opacity: 0,
      ...offsets[direction],
      scale: 0.95
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1
    }
  };
};

export function FeatureGrid() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-blue-100/20 to-purple-100/20 rounded-full blur-3xl opacity-50" />
        </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4 tracking-tight">Everything you need to understand code.</h2>
            <p className="text-xl text-gray-500 font-light">From high-level architecture to line-by-line analysis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto auto-rows-[200px]">
          {features.map((feature, idx) => {
            const variants = getAnimationVariants(feature.animateFrom);
            return (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                variants={variants}
                transition={{
                  delay: idx * 0.15,
                  duration: 0.6,
                  ease: [0.25, 0.1, 0.25, 1] // Custom easing for smooth feel
                }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                className={cn(
                  "group relative p-8 rounded-3xl border border-gray-100 hover:border-gray-200 transition-colors duration-300 hover:shadow-xl overflow-hidden",
                  feature.className,
                  feature.bg
                )}
              >
                <motion.div
                  className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"
                  initial={{ scale: 1, rotate: 0 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.5 }}
                >
                  <feature.icon className="w-32 h-32" />
                </motion.div>

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <motion.div
                    className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6"
                    whileHover={{ scale: 1.15, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <feature.icon className="h-6 w-6 text-black" />
                  </motion.div>

                  <div>
                    <h3 className="text-2xl font-bold text-black mb-2 tracking-tight">{feature.title}</h3>
                    <p className="text-gray-600 font-light leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
