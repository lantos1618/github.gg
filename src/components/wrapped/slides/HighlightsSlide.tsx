'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, UserHeader } from '../WrappedSlide';
import { Trophy, Rocket, MessageSquare, Star, Zap } from 'lucide-react';
import type { WrappedStats, WrappedAIInsights } from '@/lib/types/wrapped';

interface HighlightsSlideProps {
  username: string;
  avatarUrl: string;
  aiInsights: WrappedAIInsights | null;
  stats: WrappedStats;
  longestCommitMessage: string | null;
  shortestCommitMessage?: { message: string; length: number } | null;
}

export function HighlightsSlide({ 
  username, 
  avatarUrl, 
  aiInsights, 
  stats,
  longestCommitMessage,
}: HighlightsSlideProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'commits'>('projects');
  const [showContent, setShowContent] = useState(false);

  const topProjects = aiInsights?.topProjects;
  const commitAnalysis = aiInsights?.commitMessageAnalysis;
  const biggestWin = aiInsights?.biggestWin;

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const hasAIContent = topProjects || commitAnalysis || biggestWin;

  return (
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#fdf4ff"
      gradientTo="#f0fdf4"
    >
      <div className="w-full space-y-6">
        <div className="text-center space-y-3">
          <UserHeader username={username} avatarUrl={avatarUrl} className="justify-center" />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Your Highlights</p>
          </motion.div>
        </div>

        {hasAIContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-2"
          >
            <TabButton 
              active={activeTab === 'projects'} 
              onClick={() => setActiveTab('projects')}
              icon={<Rocket className="w-4 h-4" />}
              label="Top Projects"
            />
            <TabButton 
              active={activeTab === 'commits'} 
              onClick={() => setActiveTab('commits')}
              icon={<MessageSquare className="w-4 h-4" />}
              label="Commit Style"
            />
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {showContent && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto"
            >
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  {biggestWin && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Biggest Win</span>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{biggestWin}</p>
                    </motion.div>
                  )}

                  {topProjects && topProjects.length > 0 ? (
                    <div className="space-y-3">
                      {topProjects.slice(0, 3).map((project, index) => (
                        <motion.div
                          key={project.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{project.name}</h4>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                              {project.impact && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Zap className="w-3.5 h-3.5 text-purple-500" />
                                  <span className="text-xs text-purple-600 font-medium">{project.impact}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <FallbackStats stats={stats} />
                  )}
                </div>
              )}

              {activeTab === 'commits' && (
                <div className="space-y-4">
                  {commitAnalysis ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-semibold text-gray-700">Your Style</span>
                        </div>
                        <p className="text-gray-800 leading-relaxed">{commitAnalysis.style}</p>
                      </motion.div>

                      {commitAnalysis.commonThemes.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
                        >
                          <p className="text-sm font-semibold text-gray-700 mb-3">Common Themes</p>
                          <div className="flex flex-wrap gap-2">
                            {commitAnalysis.commonThemes.slice(0, 6).map((theme, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-full text-sm font-medium"
                              >
                                {theme}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {commitAnalysis.funFact && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-200"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-pink-500" />
                            <span className="text-sm font-semibold text-pink-700">Fun Fact</span>
                          </div>
                          <p className="text-gray-700 text-sm">{commitAnalysis.funFact}</p>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <FallbackCommitInfo 
                      longestMessage={longestCommitMessage} 
                      avgLength={stats.avgCommitMessageLength}
                      commonWords={stats.commonCommitWords}
                    />
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WrappedSlide>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active 
          ? 'bg-purple-100 text-purple-700 shadow-sm' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FallbackStats({ stats }: { stats: WrappedStats }) {
  const topRepo = stats.topRepos[0];
  
  return (
    <div className="space-y-3">
      {topRepo && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-semibold text-gray-700">Most Active Repo</span>
          </div>
          <h4 className="font-bold text-gray-900">{topRepo.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{topRepo.commits} commits • {topRepo.language || 'Mixed'}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.longestStreak}</div>
          <div className="text-xs text-gray-500">Day Streak</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
          <div className="text-2xl font-bold text-green-600">{stats.totalPRsMerged}</div>
          <div className="text-xs text-gray-500">PRs Merged</div>
        </div>
      </div>
    </div>
  );
}

function FallbackCommitInfo({ 
  longestMessage, 
  avgLength,
  commonWords 
}: { 
  longestMessage: string | null;
  avgLength: number;
  commonWords: Array<{ word: string; count: number }>;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-2">Average Message Length</p>
        <p className="text-3xl font-bold text-purple-600">{avgLength} <span className="text-sm font-normal text-gray-500">characters</span></p>
      </div>
      
      {commonWords.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Most Used Words</p>
          <div className="flex flex-wrap gap-2">
            {commonWords.slice(0, 8).map((item, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {item.word} <span className="text-gray-400">({item.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {longestMessage && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-2">Most Detailed Commit</p>
          <p className="text-sm text-gray-600 font-mono bg-gray-50 p-3 rounded-lg">
            {longestMessage.length > 150 ? `${longestMessage.slice(0, 150)}...` : longestMessage}
          </p>
        </div>
      )}
    </div>
  );
}
