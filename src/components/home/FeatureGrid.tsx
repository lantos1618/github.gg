'use client';

import { BarChart3, Network, FileText, Shield, Zap, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: BarChart3,
    title: "Scorecards",
    description: "Get A-F grades for code quality and complexity. Per file, per function.",
    span: "large",
    accent: "border-l-orange-500"
  },
  {
    icon: Network,
    title: "Diagrams",
    description: "Auto-generated architecture maps. Dependencies, data flow, class hierarchies.",
    span: "medium",
    accent: "border-l-violet-500"
  },
  {
    icon: Bot,
    title: "Slop Detector",
    description: "Find low-quality AI code.",
    span: "small",
    accent: "border-l-gray-400"
  },
  {
    icon: Shield,
    title: "Security",
    description: "Catch vulnerabilities early.",
    span: "small",
    accent: "border-l-red-500"
  },
  {
    icon: FileText,
    title: "Wiki",
    description: "Docs from your codebase.",
    span: "small",
    accent: "border-l-teal-500"
  },
  {
    icon: Zap,
    title: "PR Reviews",
    description: "Automated reviews on every pull request. Catch bugs, suggest improvements, enforce standards.",
    span: "wide",
    accent: "border-l-amber-500"
  }
];

const fadeInVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

export function FeatureGrid() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">What you get</h2>
          <p className="text-lg text-gray-500">From architecture overview to line-by-line analysis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feature, idx) => {
            const spanClass = {
              large: "md:col-span-2 md:row-span-2",
              medium: "md:col-span-1 md:row-span-2",
              small: "md:col-span-1",
              wide: "md:col-span-3"
            }[feature.span];

            return (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                variants={fadeInVariants}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                viewport={{ once: true, margin: "-40px" }}
                className={cn(
                  "bg-white border border-gray-200 border-l-4 p-6 hover:border-gray-300 transition-colors",
                  spanClass,
                  feature.accent
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <feature.icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed pl-8">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
