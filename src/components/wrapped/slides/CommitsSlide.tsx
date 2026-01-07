'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide, SlideCard, AIBadge, Confetti, UserHeader, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';
import type { WrappedAIInsights } from '@/lib/types/wrapped';
import { getWrappedYear } from '@/lib/utils/wrapped-year';

interface CommitsSlideProps {
  totalCommits: number;
  totalPRs: number;
  totalPRsMerged: number;
  linesAdded: number;
  linesDeleted: number;
  user?: { username: string; avatarUrl: string };
  aiInsights?: WrappedAIInsights | null;
}

function getFallbackMessage(commits: number): { message: string; subtext: string } {
  if (commits >= 2000) {
    return {
      message: "You're basically the machine now.",
      subtext: "Touch grass? Never heard of her.",
    };
  }
  if (commits >= 1000) {
    return {
      message: "Commit machine engaged.",
      subtext: "Your keyboard is crying for mercy.",
    };
  }
  if (commits >= 500) {
    return {
      message: "Solid work ethic detected.",
      subtext: "That's a commit every 17 hours.",
    };
  }
  if (commits >= 100) {
    return {
      message: "Quality over quantity. Respect.",
      subtext: "(We'll pretend that's the reason.)",
    };
  }
  return {
    message: "Every journey starts somewhere.",
    subtext: `${getWrappedYear() + 1} is your year. We believe in you.`,
  };
}

export function CommitsSlide({
  totalCommits,
  totalPRs,
  totalPRsMerged,
  linesAdded,
  linesDeleted,
  user,
  aiInsights,
}: CommitsSlideProps) {
  const [count, setCount] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const hasAIInsights = aiInsights?.yearSummary || aiInsights?.biggestWin;
  const fallback = getFallbackMessage(totalCommits);

  const message = aiInsights?.yearSummary || fallback.message;
  const subtext = aiInsights?.biggestWin || fallback.subtext;

  useEffect(() => {
    const duration = 1500;
    let current = 0;
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.floor(eased * totalCommits);
      setCount(current);

      if (progress >= 1) {
        setCount(totalCommits);
        clearInterval(timer);
        setShowMessage(true);
        if (totalCommits >= 500) {
          setShowConfetti(true);
        }
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [totalCommits]);

  const mergeRate = totalPRs > 0 ? Math.round((totalPRsMerged / totalPRs) * 100) : 0;

  return (
    <WrappedSlide glowPosition="top">
      {showConfetti && <Confetti />}

      <div className="text-center space-y-8">
        {user && (
          <div className="flex justify-center mb-4">
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </div>
        )}

        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={WRAPPED_STYLES.sectionLabel}
        >
          Your Commits
        </motion.p>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="relative"
        >
          <div
            className={`${WRAPPED_STYLES.heroStat} bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent`}
            style={{ filter: 'drop-shadow(0 0 40px rgba(139, 92, 246, 0.25))' }}
          >
            {count.toLocaleString()}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -inset-8 bg-violet-500/10 blur-3xl -z-10 rounded-full"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xl text-slate-500 font-medium"
        >
          commits pushed
        </motion.p>

        {showMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SlideCard glow className="max-w-md mx-auto">
              <div className="space-y-3">
                {hasAIInsights && (
                  <AIBadge className="mb-2" />
                )}
                <p className={`text-slate-700 ${hasAIInsights ? 'text-base leading-relaxed' : 'text-lg'}`}>
                  {message}
                </p>
                {subtext && (
                  <p className={`text-slate-500 ${hasAIInsights ? 'text-sm italic' : ''}`}>
                    {hasAIInsights ? `"${subtext}"` : subtext}
                  </p>
                )}
              </div>
            </SlideCard>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showMessage ? 1 : 0, y: showMessage ? 0 : 20 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-3 pt-4 max-w-md mx-auto"
        >
          <StatBox value={totalPRs} label="PRs Opened" />
          <StatBox value={`${mergeRate}%`} label="Merged" />
          <StatBox
            value={formatNumber(linesAdded - linesDeleted)}
            label="Net Lines"
            prefix={linesAdded > linesDeleted ? '+' : ''}
          />
        </motion.div>
      </div>
    </WrappedSlide>
  );
}

function StatBox({
  value,
  label,
  prefix = '',
}: {
  value: number | string;
  label: string;
  prefix?: string;
}) {
  return (
    <div className="bg-white/80 border border-slate-200/60 rounded-xl p-3 shadow-sm">
      <div className="text-xl font-bold text-violet-600">
        {prefix}
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
