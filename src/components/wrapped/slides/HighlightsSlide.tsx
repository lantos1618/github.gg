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
      <div className="w-full space-y-8">
        <div className="text-center space-y-4">
          <UserHeader username={username} avatarUrl={avatarUrl} className="justify-center" />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Highlights & Lowlights</p>
          </motion.div>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Smartest Commit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Smartest Commit</span>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
              <div className="text-4xl mb-3 text-center">🧠</div>
              {longestCommitMessage ? (
                <>
                  <p className="text-xs text-gray-500 mb-3 text-center">
                    Your longest commit message ({longestCommitMessage.length.toLocaleString()} chars)
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg border text-left">
                    <p className="text-sm text-gray-800 leading-relaxed font-mono break-words">
                      {longestCommitMessage.length > 200 
                        ? `${longestCommitMessage.slice(0, 200)}...` 
                        : longestCommitMessage}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-800 text-center">Your commits are consistently thoughtful! 🎉</p>
              )}
            </div>
          </motion.div>

          {/* Moment of Shame */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-2">
              <Skull className="w-5 h-5 text-red-500" />
              <span className="text-sm font-semibold text-red-700 uppercase tracking-wide">Moment of Shame</span>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
              <div className="text-4xl mb-3 text-center">💀</div>
              {shortestCommitMessage ? (
                <>
                  <p className="text-xs text-gray-500 mb-3 text-center">
                    Your shortest commit message ({shortestCommitMessage.length} chars)
                  </p>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-left">
                    <p className="text-sm text-gray-800 leading-relaxed font-mono">
                      &quot;{shortestCommitMessage.message}&quot;
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-800 text-center">
                  Somehow you avoided major embarrassment this year. Suspicious. 🤔
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </WrappedSlide>
  );
}
