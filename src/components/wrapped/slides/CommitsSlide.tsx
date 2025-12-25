'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide, Confetti } from '../WrappedSlide';

interface CommitsSlideProps {
  totalCommits: number;
  totalPRs: number;
  totalPRsMerged: number;
  linesAdded: number;
  linesDeleted: number;
  user?: { username: string; avatarUrl: string };
}

function getCommitMessage(commits: number): { message: string; subtext: string } {
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
    subtext: `${new Date().getFullYear() + 1} is your year. We believe in you.`,
  };
}

export function CommitsSlide({
  totalCommits,
  totalPRs,
  totalPRsMerged,
  linesAdded,
  linesDeleted,
  user,
}: CommitsSlideProps) {
  const [count, setCount] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { message, subtext } = getCommitMessage(totalCommits);

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
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#f5f3ff"
      gradientTo="#ecfeff"
      user={user}
    >
      {showConfetti && <Confetti />}
      
      <div className="text-center space-y-8">
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs uppercase tracking-[0.3em] text-gray-500 font-medium"
        >
          Your Commits
        </motion.p>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="relative"
        >
          <div className="text-8xl md:text-[10rem] font-black tabular-nums bg-gradient-to-r from-green-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent leading-none">
            {count.toLocaleString()}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -inset-8 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-cyan-500/20 blur-3xl -z-10"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl text-gray-900 font-medium"
        >
          commits pushed
        </motion.p>

        {showMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2 pt-4"
          >
            <p className="text-xl text-gray-800">{message}</p>
            <p className="text-gray-500">{subtext}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showMessage ? 1 : 0, y: showMessage ? 0 : 20 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-4 pt-8 max-w-md mx-auto"
        >
          <StatBox
            value={totalPRs}
            label="PRs Opened"
            color="from-purple-400 to-purple-600"
          />
          <StatBox
            value={`${mergeRate}%`}
            label="Merged"
            color="from-green-400 to-green-600"
          />
          <StatBox
            value={formatNumber(linesAdded - linesDeleted)}
            label="Net Lines"
            color={linesAdded > linesDeleted ? 'from-green-400 to-emerald-600' : 'from-red-400 to-red-600'}
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
  color,
  prefix = '',
}: {
  value: number | string;
  label: string;
  color: string;
  prefix?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
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
