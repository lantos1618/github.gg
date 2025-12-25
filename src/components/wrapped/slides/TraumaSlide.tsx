'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, UserHeader } from '../WrappedSlide';
import type { WrappedStats, WrappedAIInsights } from '@/lib/types/wrapped';
import { AlertTriangle, Flame, Moon, Calendar, Trash2 } from 'lucide-react';

interface TraumaSlideProps {
  stats: WrappedStats;
  aiInsights?: WrappedAIInsights | null;
  user?: { username: string; avatarUrl: string };
}

export function TraumaSlide({ stats, aiInsights, user }: TraumaSlideProps) {
  const [phase, setPhase] = useState<'intro' | 'reveal' | 'details'>('intro');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 1500),
      setTimeout(() => setPhase('details'), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const traumaEvent = aiInsights?.traumaEvent;
  const shamefulCommit = aiInsights?.shamefulCommit;
  const biggestDay = stats.commitPatterns?.biggestCommitDay;
  const lateNightCommits = stats.lateNightCommits;
  const fridayDeploys = stats.commitPatterns?.fridayDeploys || 0;

  const hasShamefulCommits = stats.shamefulCommits && (
    stats.shamefulCommits.singleCharCommits > 5 ||
    stats.shamefulCommits.fixOnlyCommits > 10 ||
    stats.shamefulCommits.cursingCommits > 0
  );

  const hasTraumaContent = traumaEvent || shamefulCommit || biggestDay || lateNightCommits > 20 || fridayDeploys > 5;

  if (!hasTraumaContent) {
    return null;
  }

  return (
    <WrappedSlide
      gradientFrom="#fef2f2"
      gradientVia="#fff7ed"
      gradientTo="#fffbeb"
    >
      <div className="text-center space-y-6">
        {user && (
          <div className="flex justify-center mb-4">
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
                className="text-6xl"
              >
                😰
              </motion.div>
              <motion.p
                className="text-2xl text-gray-700"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Time to process what happened...
              </motion.p>
            </motion.div>
          )}

          {(phase === 'reveal' || phase === 'details') && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <AlertTriangle className="w-16 h-16 mx-auto text-orange-500" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl font-bold text-gray-900"
              >
                The Trauma Report
              </motion.h2>

              {traumaEvent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-xl p-5 border border-orange-200 shadow-lg max-w-md mx-auto"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">AI Analysis</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{traumaEvent}</p>
                </motion.div>
              )}

              {phase === 'details' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 gap-3 max-w-md mx-auto"
                >
                  {biggestDay && (
                    <TraumaCard
                      icon={<Flame className="w-5 h-5 text-red-500" />}
                      title="The Marathon"
                      value={`${biggestDay.count} commits`}
                      subtitle={`on ${new Date(biggestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      delay={0.1}
                    />
                  )}

                  {lateNightCommits > 20 && (
                    <TraumaCard
                      icon={<Moon className="w-5 h-5 text-indigo-500" />}
                      title="Night Owl"
                      value={`${lateNightCommits}`}
                      subtitle="commits after midnight"
                      delay={0.2}
                    />
                  )}

                  {fridayDeploys > 5 && (
                    <TraumaCard
                      icon={<Calendar className="w-5 h-5 text-orange-500" />}
                      title="YOLO Fridays"
                      value={`${fridayDeploys}`}
                      subtitle="Friday deploys"
                      delay={0.3}
                    />
                  )}

                  {hasShamefulCommits && (
                    <TraumaCard
                      icon={<Trash2 className="w-5 h-5 text-gray-500" />}
                      title="Lazy Commits"
                      value={`${stats.shamefulCommits.fixOnlyCommits + stats.shamefulCommits.singleCharCommits}`}
                      subtitle="'fix' or single-char"
                      delay={0.4}
                    />
                  )}
                </motion.div>
              )}

              {phase === 'details' && shamefulCommit && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-200 max-w-md mx-auto"
                >
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
                    🏆 Most Shameful Commit
                  </p>
                  <p className="font-mono text-sm text-gray-800 bg-white/50 rounded px-2 py-1 mb-2">
                    &quot;{shamefulCommit.message}&quot;
                  </p>
                  <p className="text-xs text-gray-600">
                    in <span className="font-medium">{shamefulCommit.repo}</span>
                  </p>
                  <p className="text-xs text-red-500 mt-2 italic">{shamefulCommit.reason}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WrappedSlide>
  );
}

function TraumaCard({
  icon,
  title,
  value,
  subtitle,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-600 uppercase">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </motion.div>
  );
}
