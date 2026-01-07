'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, SlideCard, Confetti, UserHeader, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';
import type { WrappedAIInsights } from '@/lib/types/wrapped';
import { PERSONALITY_TYPES } from '@/lib/types/wrapped';
import { getWrappedYear } from '@/lib/utils/wrapped-year';

interface PersonalitySlideProps {
  aiInsights: WrappedAIInsights | null;
  stats: {
    peakHour: number;
    lateNightCommits: number;
    longestStreak: number;
    topLanguage?: string;
  };
  user?: { username: string; avatarUrl: string };
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

export function PersonalitySlide({ aiInsights, stats, user }: PersonalitySlideProps) {
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
    <WrappedSlide glowPosition="center">
      {showConfetti && <Confetti />}

      <div className="text-center space-y-8">
        {user && (
          <div className="flex justify-center mb-4">
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </div>
        )}

        {/* Min-height prevents CLS during phase transitions */}
        <div className="min-h-[320px] flex items-center justify-center">
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
                className="text-xl text-slate-500"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Based on everything...
              </motion.p>
              <motion.div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-violet-400"
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
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={WRAPPED_STYLES.sectionLabel}
              >
                Your {getWrappedYear()} Developer Personality
              </motion.p>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-7xl md:text-8xl"
              >
                {personality.emoji}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={WRAPPED_STYLES.heroSecondary}
                style={{ color: WRAPPED_THEME.accent, textShadow: `0 0 40px ${WRAPPED_THEME.accentGlow}` }}
              >
                {personality.name}
              </motion.h2>

              {phase === 'details' && personality.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base text-slate-500 max-w-md mx-auto leading-relaxed"
                >
                  {personality.description}
                </motion.p>
              )}

              {phase === 'details' && aiInsights?.roast && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-4"
                >
                  <SlideCard className="max-w-md mx-auto">
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">The Roast</p>
                    <p className="text-slate-700 italic">&ldquo;{aiInsights.roast}&rdquo;</p>
                  </SlideCard>
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
    A: 'text-emerald-400',
    B: 'text-violet-400',
    C: 'text-amber-400',
    D: 'text-orange-400',
    F: 'text-red-400',
  };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className={`text-5xl font-black ${gradeColors[grade] || gradeColors.C}`}
        style={{ textShadow: '0 0 30px currentColor' }}
      >
        {grade}
      </div>
      {description && (
        <p className="text-sm text-slate-600">{description}</p>
      )}
    </div>
  );
}
