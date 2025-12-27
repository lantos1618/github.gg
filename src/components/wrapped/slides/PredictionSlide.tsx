'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, SlideCard, AIBadge, UserHeader, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';
import type { WrappedAIInsights } from '@/lib/types/wrapped';
import { Sparkles } from 'lucide-react';

interface PredictionSlideProps {
  year: number;
  aiInsights?: WrappedAIInsights | null;
  user?: { username: string; avatarUrl: string };
}

export function PredictionSlide({ year, aiInsights, user }: PredictionSlideProps) {
  const [phase, setPhase] = useState<'crystal' | 'reveal'>('crystal');

  const prediction = aiInsights?.prediction2025;
  const nextYear = year + 1;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!prediction) {
    return null;
  }

  return (
    <WrappedSlide glowPosition="center">
      <div className="text-center space-y-8 relative">
        {user && (
          <div className="flex justify-center mb-4">
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </div>
        )}

        {/* Min-height prevents CLS during phase transitions */}
        <div className="min-h-[280px] flex items-center justify-center">
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
                className="text-7xl"
              >
                🔮
              </motion.div>
              <motion.p
                className="text-xl text-slate-500"
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
                <span
                  className="text-6xl md:text-7xl font-black"
                  style={{ color: WRAPPED_THEME.accent, textShadow: `0 0 50px ${WRAPPED_THEME.accentGlow}` }}
                >
                  {nextYear}
                </span>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-4 border border-dashed border-violet-500/30 rounded-full"
                />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={WRAPPED_STYLES.sectionLabel}
              >
                Your {nextYear} Prediction
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <SlideCard glow className="max-w-md mx-auto">
                  <AIBadge className="mb-3" />
                  <p className="text-slate-700 leading-relaxed text-lg">
                    {prediction}
                  </p>
                </SlideCard>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-slate-600 text-sm"
              >
                Based on your {year} coding patterns
              </motion.p>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Floating sparkles */}
        {phase === 'reveal' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 15 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  opacity: 0,
                  x: Math.random() * 300 - 150,
                  y: Math.random() * 300 - 150,
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
                <Sparkles className="w-4 h-4 text-violet-400/60" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </WrappedSlide>
  );
}
