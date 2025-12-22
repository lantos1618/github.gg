'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';
import { Trophy, Skull } from 'lucide-react';
import type { WrappedStats, WrappedAIInsights } from '@/lib/types/wrapped';

interface HighlightsSlideProps {
  username: string;
  avatarUrl: string;
  aiInsights: WrappedAIInsights | null;
  stats: WrappedStats;
}

function getShamefulHighlight(stats: WrappedStats): { title: string; value: string; emoji: string } | null {
  const shameful = stats.shamefulCommits;
  if (!shameful) return null;

  if (shameful.cursingCommits > 5) {
    return { title: 'Commits with profanity', value: `${shameful.cursingCommits} times`, emoji: '🤬' };
  }
  if (shameful.wcCommits > 10) {
    return { title: '"wip" commits', value: `${shameful.wcCommits} times`, emoji: '🚧' };
  }
  if (shameful.fixOnlyCommits > 20) {
    return { title: 'Just "fix" as message', value: `${shameful.fixOnlyCommits} times`, emoji: '🔧' };
  }
  if (shameful.singleCharCommits > 5) {
    return { title: 'Single character commits', value: `${shameful.singleCharCommits} times`, emoji: '.' };
  }
  if (shameful.allCapsCommits > 10) {
    return { title: 'ALL CAPS COMMITS', value: `${shameful.allCapsCommits} times`, emoji: '📢' };
  }
  if (shameful.laziestMessages?.[0]) {
    return { 
      title: 'Most repeated message', 
      value: `"${shameful.laziestMessages[0].message}" (${shameful.laziestMessages[0].count}x)`, 
      emoji: '🔄' 
    };
  }
  return null;
}

export function HighlightsSlide({ username, avatarUrl, aiInsights, stats }: HighlightsSlideProps) {
  const [phase, setPhase] = useState<'avatar' | 'cool' | 'dumb'>('avatar');

  const coolestThing = aiInsights?.biggestWin;
  const dumbestThing = aiInsights?.traumaEvent;
  const shamefulHighlight = getShamefulHighlight(stats);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('cool'), 1500),
      setTimeout(() => setPhase('dumb'), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#fdf4ff"
      gradientTo="#f0fdf4"
    >
      <div className="text-center space-y-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative inline-block"
        >
          <div className="relative">
            <img
              src={avatarUrl}
              alt={username}
              className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white shadow-xl"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -inset-2 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-orange-400/30 rounded-full blur-xl -z-10"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-3"
          >
            <p className="text-lg font-semibold text-gray-900">@{username}</p>
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          {phase === 'avatar' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-4"
            >
              <motion.p
                className="text-xl text-gray-600"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Let&apos;s talk about the highs and lows...
              </motion.p>
            </motion.div>
          )}

          {phase === 'cool' && coolestThing && (
            <motion.div
              key="cool"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full border border-amber-200">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Coolest Moment</span>
              </div>
              
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg max-w-md mx-auto"
              >
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-lg text-gray-800 leading-relaxed">{coolestThing}</p>
              </motion.div>
            </motion.div>
          )}

          {phase === 'dumb' && (
            <motion.div
              key="dumb"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-100 to-orange-100 rounded-full border border-red-200">
                <Skull className="w-5 h-5 text-red-500" />
                <span className="text-sm font-semibold text-red-700 uppercase tracking-wide">Moment of Shame</span>
              </div>
              
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg max-w-md mx-auto"
              >
                <div className="text-4xl mb-3">💀</div>
                {dumbestThing ? (
                  <p className="text-lg text-gray-800 leading-relaxed">{dumbestThing}</p>
                ) : shamefulHighlight ? (
                  <div className="space-y-2">
                    <p className="text-2xl">{shamefulHighlight.emoji}</p>
                    <p className="text-sm text-gray-500">{shamefulHighlight.title}</p>
                    <p className="text-lg font-semibold text-gray-800">{shamefulHighlight.value}</p>
                  </div>
                ) : (
                  <p className="text-lg text-gray-800 leading-relaxed">
                    Somehow you avoided major embarrassment this year. Suspicious. 🤔
                  </p>
                )}
              </motion.div>

              {shamefulHighlight && dumbestThing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-2"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600">
                    <span>{shamefulHighlight.emoji}</span>
                    <span>{shamefulHighlight.title}: {shamefulHighlight.value}</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WrappedSlide>
  );
}
