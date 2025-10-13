'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Check } from 'lucide-react';
import { useRef } from 'react';
import { FeatureRequestBox } from './FeatureRequestBox';

interface Feature {
  title: string;
  description: string;
  completed: boolean;
}

interface FeaturesTimelineProps {
  features: Feature[];
}

export function FeaturesTimeline({ features }: FeaturesTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress of the timeline container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  // Sort features: completed first, then incomplete
  const sortedFeatures = [...features].sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    return 0;
  });

  return (
    <div className="py-20 px-8">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-4xl font-bold text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Features
        </motion.h2>

        <div ref={containerRef} className="relative">
          {/* Background line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 transform -translate-x-1/2" />

          {/* Animated gradient line that follows scroll */}
          <motion.div
            className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 transform -translate-x-1/2 origin-top"
            style={{ scaleY: scrollYProgress }}
          />

          <div className="space-y-12">
            {sortedFeatures.map((feature, index) => {
              const isEven = index % 2 === 0;

              // Calculate scroll-based progress for each item
              // Each item appears when the line reaches its position
              const itemPosition = index / sortedFeatures.length;
              const animationWindow = 0.06; // Tight animation window for sync

              // Dot appears just before the line reaches it
              const dotStart = Math.max(0, itemPosition - animationWindow);
              const dotEnd = itemPosition;

              // Check mark animation starts and FINISHES when line reaches the dot
              // Start the check animation earlier so it completes right when line arrives
              const checkStart = Math.max(0, itemPosition - animationWindow);
              const checkEnd = itemPosition;

              // Transform scroll progress to item-specific scale values
              const dotScale = useTransform(
                scrollYProgress,
                [dotStart, dotEnd],
                [0, 1]
              );

              const checkScale = useTransform(
                scrollYProgress,
                [checkStart, checkEnd],
                [0, 1]
              );

              const checkRotate = useTransform(
                scrollYProgress,
                [checkStart, checkEnd],
                [-180, 0]
              );

              return (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className={`flex items-center gap-8 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`w-1/2 ${isEven ? 'text-right pr-8' : 'text-left pl-8'}`}>
                      <div className={`inline-block ${isEven ? 'text-right' : 'text-left'} w-full`}>
                        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-gray-600">{feature.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline dot with animated check mark - synced with line */}
                    <motion.div
                      className={`absolute left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full border-4 z-10 flex items-center justify-center ${
                        feature.completed
                          ? 'bg-green-500 border-green-600'
                          : 'bg-white border-blue-500'
                      }`}
                      style={{ scale: dotScale }}
                    >
                      {feature.completed && (
                        <motion.div
                          style={{
                            scale: checkScale,
                            rotate: checkRotate
                          }}
                        >
                          <Check className="w-5 h-5 text-white" />
                        </motion.div>
                      )}
                    </motion.div>

                    <div className={`w-1/2 ${isEven ? 'pl-8' : 'pr-8'}`}>
                      <div className="bg-gray-200 rounded-lg overflow-hidden shadow-md aspect-video flex items-center justify-center">
                        <svg
                          className="w-16 h-16 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Feature Request Box */}
          <FeatureRequestBox />
        </div>

        {/* Trademark Disclaimer */}
        <motion.div
          className="mt-16 text-center text-sm text-gray-500"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <p>
            gh.gg is not affiliated with, endorsed by, or sponsored by GitHub, Inc.
            <br />
            GitHub is a registered trademark of GitHub, Inc.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
