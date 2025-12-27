'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, SlideCard, AIBadge, UserHeader, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';
import { Trophy, Rocket, MessageSquare, Zap } from 'lucide-react';
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
    <WrappedSlide glowPosition="center">
      <div className="w-full space-y-6">
        <div className="text-center space-y-3">
          <UserHeader username={username} avatarUrl={avatarUrl} className="justify-center" />
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={WRAPPED_STYLES.sectionLabel}
          >
            Your Highlights
          </motion.p>
        </div>

        {/* Reserve space for tabs to prevent CLS */}
        <div className="min-h-[44px]">
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
        </div>

        {/* Min-height prevents CLS during tab transitions */}
        <div className="min-h-[280px]">
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
                    <SlideCard glow>
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-violet-400" />
                        <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Biggest Win</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{biggestWin}</p>
                    </SlideCard>
                  )}

                  {topProjects && topProjects.length > 0 ? (
                    <div className="space-y-3">
                      {topProjects.slice(0, 3).map((project, index) => (
                        <motion.div
                          key={project.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                        >
                          <SlideCard>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-sm shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-800 truncate">{project.name}</h4>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.description}</p>
                                {project.impact && (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <Zap className="w-3.5 h-3.5 text-violet-400" />
                                    <span className="text-xs text-violet-400 font-medium">{project.impact}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </SlideCard>
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
                      <SlideCard glow>
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="w-5 h-5 text-violet-400" />
                          <span className="text-sm font-semibold text-slate-700">Your Style</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{commitAnalysis.style}</p>
                      </SlideCard>

                      {commitAnalysis.commonThemes.length > 0 && (
                        <SlideCard>
                          <p className="text-sm font-semibold text-slate-700 mb-3">Common Themes</p>
                          <div className="flex flex-wrap gap-2">
                            {commitAnalysis.commonThemes.slice(0, 6).map((theme, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full text-sm font-medium"
                              >
                                {theme}
                              </span>
                            ))}
                          </div>
                        </SlideCard>
                      )}

                      {commitAnalysis.funFact && (
                        <SlideCard>
                          <AIBadge className="mb-2" />
                          <p className="text-slate-700 text-sm">{commitAnalysis.funFact}</p>
                        </SlideCard>
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
      </div>
    </WrappedSlide>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
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
          ? 'bg-violet-500/20 border border-violet-500/30 text-violet-400'
          : 'bg-white/80 border border-slate-200/60 text-slate-500 hover:text-slate-600'
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
        <SlideCard>
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-semibold text-slate-700">Most Active Repo</span>
          </div>
          <h4 className="font-bold text-slate-800">{topRepo.name}</h4>
          <p className="text-sm text-slate-600 mt-1">{topRepo.commits} commits • {topRepo.language || 'Mixed'}</p>
        </SlideCard>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SlideCard className="text-center">
          <div className="text-2xl font-bold text-violet-400">{stats.longestStreak}</div>
          <div className="text-xs text-slate-600">Day Streak</div>
        </SlideCard>
        <SlideCard className="text-center">
          <div className="text-2xl font-bold text-violet-400">{stats.totalPRsMerged}</div>
          <div className="text-xs text-slate-600">PRs Merged</div>
        </SlideCard>
      </div>
    </div>
  );
}

function FallbackCommitInfo({
  longestMessage,
  avgLength,
  commonWords,
}: {
  longestMessage: string | null;
  avgLength: number;
  commonWords: Array<{ word: string; count: number }>;
}) {
  return (
    <div className="space-y-4">
      <SlideCard>
        <p className="text-sm font-semibold text-slate-700 mb-2">Average Message Length</p>
        <p className="text-3xl font-bold text-violet-400">
          {avgLength} <span className="text-sm font-normal text-slate-600">characters</span>
        </p>
      </SlideCard>

      {commonWords.length > 0 && (
        <SlideCard>
          <p className="text-sm font-semibold text-slate-700 mb-3">Most Used Words</p>
          <div className="flex flex-wrap gap-2">
            {commonWords.slice(0, 8).map((item, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-white/80 border border-slate-200/60 text-slate-700 rounded-full text-sm"
              >
                {item.word} <span className="text-slate-600">({item.count})</span>
              </span>
            ))}
          </div>
        </SlideCard>
      )}

      {longestMessage && (
        <SlideCard>
          <p className="text-sm font-semibold text-slate-700 mb-2">Most Detailed Commit</p>
          <p className="text-sm text-slate-500 font-mono bg-white/80 p-3 rounded-lg">
            {longestMessage.length > 150 ? `${longestMessage.slice(0, 150)}...` : longestMessage}
          </p>
        </SlideCard>
      )}
    </div>
  );
}
