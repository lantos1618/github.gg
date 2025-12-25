'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, UserHeader } from '../WrappedSlide';
import type { WrappedAIInsights } from '@/lib/types/wrapped';
import { Sparkles } from 'lucide-react';

interface PredictionSlideProps {
  year: number;
  aiInsights?: WrappedAIInsights | null;
  user?: { username: string; avatarUrl: string };
}

export function PredictionSlide({ year, aiInsights, user }: PredictionSlideProps) {
  const [phase, setPhase] = useState<'crystal' | 'reveal'>('crystal');
  const [showSparkles, setShowSparkles] = useState(false);

  const prediction = aiInsights?.prediction2025;
  const nextYear = year + 1;

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setPhase('reveal');
        setShowSparkles(true);
      }, 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!prediction) {
    return null;
  }

  return (
    <WrappedSlide
      gradientFrom="#f5f3ff"
      gradientVia="#ede9fe"
      gradientTo="#ddd6fe"
    >
      <div className="text-center space-y-8 relative">
        {user && (
          <div className="flex justify-center mb-4">
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {phase === 'crystal' && (
            <motion.div
              key="crystal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="space-y-6"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-8xl"
              >
                🔮
              </motion.div>
              <motion.p
                className="text-2xl text-purple-700"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Gazing into your future...
              </motion.p>
            </motion.div>
          )}

          {phase === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="relative inline-block"
              >
                <span className="text-7xl md:text-8xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                  {nextYear}
                </span>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-4 border-2 border-dashed border-purple-300 rounded-full"
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl md:text-2xl font-bold text-purple-800"
              >
                Your {nextYear} Prediction
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-200 shadow-xl max-w-md mx-auto"
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                    AI Prediction
                  </span>
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {prediction}
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-purple-500 text-sm"
              >
                Based on your {year} coding patterns
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {showSparkles && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{ 
                  opacity: 0,
                  x: Math.random() * 400 - 200,
                  y: Math.random() * 400 - 200,
                  scale: 0,
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  rotate: [0, 180],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 3,
                }}
                style={{
                  left: '50%',
                  top: '50%',
                }}
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </WrappedSlide>
  );
}
