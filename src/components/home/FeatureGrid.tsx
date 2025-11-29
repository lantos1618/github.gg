'use client';

import { BarChart3, Network, FileText, Shield, Zap, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: BarChart3,
    title: "Scorecards",
    description: "Instant health check on code quality and complexity. Get a grade for every file.",
    className: "md:col-span-2 md:row-span-2",
    bg: "bg-blue-50/50"
  },
  {
    icon: Network,
    title: "Interactive Diagrams",
    description: "Visualize dependencies, class hierarchies, and data flow automatically.",
    className: "md:col-span-1 md:row-span-2",
    bg: "bg-purple-50/50"
  },
  {
    icon: Bot,
    title: "Slop Detector",
    description: "Identify low-quality AI-generated code patterns.",
    className: "md:col-span-1 md:row-span-1",
    bg: "bg-gray-50/50"
  },
  {
    icon: Shield,
    title: "Security Scan",
    description: "Spot vulnerabilities before production.",
    className: "md:col-span-1 md:row-span-1",
    bg: "bg-gray-50/50"
  },
  {
    icon: FileText,
    title: "Instant Wiki",
    description: "Turn your repo into a searchable documentation site.",
    className: "md:col-span-1 md:row-span-1",
    bg: "bg-gray-50/50"
  },
  {
    icon: Zap,
    title: "AI Reviews",
    description: "Automated code reviews on every Pull Request.",
    className: "md:col-span-3 md:row-span-1",
    bg: "bg-emerald-50/50"
  }
];

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
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={cn(
                "group relative p-8 rounded-3xl border border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-xl overflow-hidden",
                feature.className,
                feature.bg
              )}
            >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                    <feature.icon className="w-32 h-32" />
                </div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-black" />
                </div>
                
                <div>
                    <h3 className="text-2xl font-bold text-black mb-2 tracking-tight">{feature.title}</h3>
                    <p className="text-gray-600 font-light leading-relaxed">
                        {feature.description}
                    </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
