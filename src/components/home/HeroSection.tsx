'use client';

import { ScrollingRepos } from '@/components/ScrollingRepos';
import { motion } from 'framer-motion';

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerChildren = {
  visible: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

export function HeroSection() {
  return (
    <div className="relative flex items-center justify-center min-h-[80vh] p-8">
      <ScrollingRepos className="translate-y-40" />
      <motion.div
        className="relative z-10 max-w-3xl mx-auto text-center bg-gray-50/30 backdrop-blur-xl p-12 rounded-2xl shadow-lg border border-gray-200/50"
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
      >
        <motion.h1
          className="text-6xl font-bold text-black mb-6 tracking-tight"
          variants={fadeUpVariants}
          transition={{ duration: 0.5 }}
        >
          github.gg
        </motion.h1>

        <motion.p
          className="text-2xl font-medium text-gray-900"
          variants={fadeUpVariants}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          The missing intelligence layer for GitHub.
        </motion.p>
        <motion.p
          className="text-lg text-gray-700 mt-4 max-w-xl mx-auto"
          variants={fadeUpVariants}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Analyze, visualize, and understand your repositories like never
          before.
        </motion.p>
      </motion.div>
    </div>
  );
} 