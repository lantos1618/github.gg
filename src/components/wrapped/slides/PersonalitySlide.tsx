'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, Confetti } from '../WrappedSlide';
import type { WrappedAIInsights } from '@/lib/types/wrapped';
import { PERSONALITY_TYPES } from '@/lib/types/wrapped';

interface PersonalitySlideProps {
  aiInsights: WrappedAIInsights | null;
  stats: {
    peakHour: number;
    lateNightCommits: number;
    longestStreak: number;
    topLanguage?: string;
  };
}

function derivePersonality(stats: PersonalitySlideProps['stats']) {
  if (stats.lateNightCommits > 50 && stats.peakHour >= 0 && stats.peakHour < 5) {
    return PERSONALITY_TYPES.find(p => p.id === 'midnight-archaeologist');
  }
  if (stats.longestStreak > 30) {
    return PERSONALITY_TYPES.find(p => p.id === 'streak-demon');
  }
  if (stats.peakHour >= 9 && stats.peakHour < 17) {
    return PERSONALITY_TYPES.find(p => p.id === 'corporate-soldier');
  }
  return PERSONALITY_TYPES.find(p => p.id === 'chaos-agent');
}

export function PersonalitySlide({ aiInsights, stats }: PersonalitySlideProps) {
  const [phase, setPhase] = useState<'buildup' | 'reveal' | 'details'>('buildup');
  const [showConfetti, setShowConfetti] = useState(false);

  const personality = aiInsights
    ? {
        name: aiInsights.personalityType,
        emoji: aiInsights.personalityEmoji,
        description: aiInsights.personalityDescription,
      }
    : (() => {
        const derived = derivePersonality(stats);
        return derived
          ? { name: derived.name, emoji: derived.emoji, description: '' }
          : { name: 'The Code Warrior', emoji: '⚔️', description: '' };
      })();

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 2000),
      setTimeout(() => {
        setShowConfetti(true);
        setPhase('details');
      }, 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <WrappedSlide variant="neon">
      {showConfetti && <Confetti />}
      
      <div className="text-center space-y-8">
        <AnimatePresence mode="wait">
          {phase === 'buildup' && (
            <motion.div
              key="buildup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <motion.p
                className="text-2xl text-gray-600"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Based on everything...
              </motion.p>
              <motion.div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-purple-500"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {(phase === 'reveal' || phase === 'details') && (
            <motion.div
              key="reveal"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm uppercase tracking-widest text-purple-600"
              >
                Your 2024 Developer Personality
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-8xl md:text-9xl"
              >
                {personality.emoji}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl md:text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent"
              >
                {personality.name}
              </motion.h2>

              {phase === 'details' && personality.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg text-gray-600 max-w-md mx-auto"
                >
                  {personality.description}
                </motion.p>
              )}

              {phase === 'details' && aiInsights?.roast && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-6"
                >
                  <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-md mx-auto shadow-sm">
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">The Roast</p>
                    <p className="text-gray-700 italic">&ldquo;{aiInsights.roast}&rdquo;</p>
                  </div>
                </motion.div>
              )}

              {phase === 'details' && aiInsights?.overallGrade && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="pt-4"
                >
                  <GradeBadge
                    grade={aiInsights.overallGrade}
                    description={aiInsights.gradeDescription}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WrappedSlide>
  );
}

function GradeBadge({
  grade,
  description,
}: {
  grade: string;
  description: string | null;
}) {
  const gradeColors: Record<string, string> = {
    A: 'from-green-400 to-emerald-500',
    B: 'from-blue-400 to-cyan-500',
    C: 'from-yellow-400 to-orange-500',
    D: 'from-orange-400 to-red-500',
    F: 'from-red-400 to-red-600',
  };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className={`text-6xl font-black bg-gradient-to-r ${gradeColors[grade] || gradeColors.C} bg-clip-text text-transparent`}
      >
        {grade}
      </div>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}
