'use client';

import { motion } from 'framer-motion';
import { WrappedSlide, UserHeader } from '../WrappedSlide';
import { Trophy, Skull } from 'lucide-react';
import type { WrappedStats, WrappedAIInsights } from '@/lib/types/wrapped';

interface HighlightsSlideProps {
  username: string;
  avatarUrl: string;
  aiInsights: WrappedAIInsights | null;
  stats: WrappedStats;
  longestCommitMessage: string | null;
  shortestCommitMessage: { message: string; length: number } | null;
}

export function HighlightsSlide({ username, avatarUrl, longestCommitMessage, shortestCommitMessage }: HighlightsSlideProps) {
  return (
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#fdf4ff"
      gradientTo="#f0fdf4"
    >
      <div className="space-y-4">
        <UserHeader username={username} avatarUrl={avatarUrl} className="mb-6" />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Highlights & Lowlights</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-green-100 rounded-full border border-emerald-200">
            <Trophy className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Smartest Commit</span>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-md max-w-md mx-auto">
            <div className="text-3xl mb-2">🧠</div>
            {longestCommitMessage ? (
              <>
                <p className="text-[10px] text-gray-500 mb-1">Your longest commit message ({longestCommitMessage.length} chars):</p>
                <p className="text-sm text-gray-800 leading-relaxed font-mono bg-gray-50 p-2 rounded border text-left">
                  {longestCommitMessage.length > 120 
                    ? `${longestCommitMessage.slice(0, 120)}...` 
                    : longestCommitMessage}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-800">Your commits are consistently thoughtful! 🎉</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-100 to-orange-100 rounded-full border border-red-200">
            <Skull className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Moment of Shame</span>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-md max-w-md mx-auto">
            <div className="text-3xl mb-2">💀</div>
            {shortestCommitMessage ? (
              <>
                <p className="text-[10px] text-gray-500 mb-1">Your shortest commit message ({shortestCommitMessage.length} chars):</p>
                <p className="text-sm text-gray-800 leading-relaxed font-mono bg-red-50 p-2 rounded border border-red-200 text-left">
                  &quot;{shortestCommitMessage.message}&quot;
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-800">
                Somehow you avoided major embarrassment this year. Suspicious. 🤔
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </WrappedSlide>
  );
}
