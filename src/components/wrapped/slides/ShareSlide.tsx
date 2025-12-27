'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide, SlideCard, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';
import { Button } from '@/components/ui/button';
import { Copy, Check, Code, Share2, ExternalLink, Moon, Calendar, Flame, Clock, TrendingUp, GitPullRequest, Zap, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import type { WrappedData } from '@/lib/types/wrapped';
import { cn } from '@/lib/utils';

interface ShareSlideProps {
  data: WrappedData;
}

const HOUR_LABELS = [
  '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm',
];

const gradeColors: Record<string, string> = {
  'A+': 'text-emerald-400',
  A: 'text-emerald-400',
  'A-': 'text-emerald-400',
  'B+': 'text-violet-400',
  B: 'text-violet-400',
  'B-': 'text-violet-400',
  'C+': 'text-amber-400',
  C: 'text-amber-400',
  'C-': 'text-amber-400',
  D: 'text-orange-400',
  F: 'text-red-400',
};

export function ShareSlide({ data }: ShareSlideProps) {
  const [copied, setCopied] = useState<'link' | 'badge' | null>(null);
  const [showBadgeCode, setShowBadgeCode] = useState(false);

  const shareUrl = `https://github.gg/wrapped/${data.year}/${data.username}`;
  const twitterText = `My ${data.year} GitHub Wrapped is here!

${data.stats.totalCommits.toLocaleString()} commits
Top language: ${data.stats.languages[0]?.name || 'Code'}
${data.aiInsights?.personalityType ? `Personality: ${data.aiInsights.personalityType}` : ''}

Get yours at github.gg/wrapped`;

  const badgeMarkdown = `[![${data.year} GitHub Wrapped](https://github.gg/wrapped/${data.year}/${data.username}/badge.svg)](${shareUrl})`;
  const badgeHtml = `<a href="${shareUrl}"><img src="https://github.gg/wrapped/${data.year}/${data.username}/badge.svg" alt="${data.year} GitHub Wrapped" /></a>`;

  const handleCopy = async (type: 'link' | 'badge', text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const mergeRate = data.stats.totalPRs > 0
    ? Math.round((data.stats.totalPRsMerged / data.stats.totalPRs) * 100)
    : 0;

  const topLanguage = data.stats.languages[0];
  const peakHourLabel = HOUR_LABELS[data.stats.peakHour] || `${data.stats.peakHour}:00`;
  const gradeColor = data.aiInsights?.overallGrade
    ? gradeColors[data.aiInsights.overallGrade] || 'text-zinc-400'
    : null;

  return (
    <WrappedSlide glowPosition="top">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-1">
            That&apos;s a wrap!
          </h2>
          <p className="text-slate-600 text-sm">Share your coding journey with the world</p>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <SlideCard glow className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={`https://avatars.githubusercontent.com/${data.username}`}
                  alt={data.username}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full border border-slate-200/60"
                />
                <div>
                  <p className="font-semibold text-slate-800">@{data.username}</p>
                  <p className="text-xs text-slate-600">{data.year} Wrapped</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {data.aiInsights?.overallGrade && gradeColor && (
                  <span className={cn('text-2xl font-black', gradeColor)}>
                    {data.aiInsights.overallGrade}
                  </span>
                )}
                {data.aiInsights?.personalityEmoji && (
                  <span className="text-2xl">{data.aiInsights.personalityEmoji}</span>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatCard
                icon={<Zap className="w-3.5 h-3.5" />}
                value={data.stats.totalCommits}
                label="Commits"
                growth={data.stats.growthPercentage}
                delay={0.2}
              />
              <StatCard
                icon={<GitPullRequest className="w-3.5 h-3.5" />}
                value={data.stats.totalPRs}
                label="PRs"
                subValue={`${mergeRate}% merged`}
                delay={0.25}
              />
              <StatCard
                icon={<Flame className="w-3.5 h-3.5" />}
                value={data.stats.longestStreak}
                label="Day Streak"
                delay={0.3}
              />
            </div>

            {/* Mini Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <MiniStatCard
                icon={<Clock className="w-3 h-3" />}
                value={peakHourLabel}
                label="Peak Hour"
              />
              <MiniStatCard
                icon={<Moon className="w-3 h-3" />}
                value={data.stats.lateNightCommits}
                label="Late Night"
              />
              <MiniStatCard
                icon={<Calendar className="w-3 h-3" />}
                value={data.stats.weekendCommits}
                label="Weekend"
              />
            </div>

            {/* Language & Personality */}
            <div className="flex gap-2">
              {topLanguage && (
                <div className="flex-1 bg-white/80 border border-slate-200/60 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                    <span className="text-sm font-semibold text-slate-700">{topLanguage.name}</span>
                    <span className="text-xs text-slate-600 ml-auto">{topLanguage.percentage}%</span>
                  </div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wide mt-1">Top Language</p>
                </div>
              )}

              {data.aiInsights?.personalityType && (
                <div className="flex-1 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                  <p className="text-sm font-semibold text-violet-400 truncate">
                    {data.aiInsights.personalityType}
                  </p>
                  <p className="text-[10px] text-violet-500/70 uppercase tracking-wide mt-1">Personality</p>
                </div>
              )}
            </div>
          </SlideCard>
        </motion.div>

        {/* Share Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleTwitterShare}
              className="h-11 bg-white/80 hover:bg-slate-100 text-slate-800 border border-slate-200/60 font-medium"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share on X
            </Button>
            <Button
              onClick={handleLinkedInShare}
              className="h-11 bg-white/80 hover:bg-slate-100 text-slate-800 border border-slate-200/60 font-medium"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              LinkedIn
            </Button>
          </div>

          <Button
            onClick={() => handleCopy('link', shareUrl)}
            variant="outline"
            className="w-full h-11 bg-white/80 border-slate-200/60 hover:bg-slate-100 text-slate-700"
          >
            {copied === 'link' ? (
              <>
                <Check className="w-4 h-4 mr-2 text-violet-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </motion.div>

        {/* Badge Code */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-2"
        >
          <Button
            onClick={() => setShowBadgeCode(!showBadgeCode)}
            variant="ghost"
            className="w-full text-slate-600 hover:text-slate-500 text-sm"
          >
            <Code className="w-4 h-4 mr-2" />
            Add badge to your README
          </Button>

          {/* Grid-based expand animation prevents CLS - uses grid-rows instead of height */}
          <div
            className="grid transition-all duration-300 ease-out"
            style={{ gridTemplateRows: showBadgeCode ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <SlideCard className="space-y-3">
                <div>
                  <p className="text-xs text-slate-600 mb-2">Markdown</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-white/80 p-2 rounded-lg font-mono text-slate-500 overflow-x-auto border border-slate-200/60">
                      {badgeMarkdown}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy('badge', badgeMarkdown)}
                      className="shrink-0 text-slate-600 hover:text-slate-700"
                    >
                      {copied === 'badge' ? <Check className="w-4 h-4 text-violet-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-2">HTML</p>
                  <code className="block text-xs bg-white/80 p-2 rounded-lg font-mono text-slate-500 overflow-x-auto border border-slate-200/60">
                    {badgeHtml}
                  </code>
                </div>
              </SlideCard>
            </div>
          </div>
        </motion.div>

        {/* Profile Link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="pt-2"
        >
          <Link href={`/${data.username}`} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              className="w-full h-11 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 font-medium"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Your Full Profile Scorecard
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="text-center text-slate-500 text-xs pt-2"
        >
          See you in {data.year + 1}!
        </motion.p>
      </div>
    </WrappedSlide>
  );
}

function StatCard({
  icon,
  value,
  label,
  subValue,
  growth,
  delay = 0,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  subValue?: string;
  growth?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/80 rounded-xl p-3 text-center border border-slate-200/60"
    >
      <div className="flex items-center justify-center gap-1 mb-1">
        <span className="text-violet-400">{icon}</span>
      </div>
      <div className="text-xl font-bold text-slate-800">
        {value.toLocaleString()}
      </div>
      {growth !== undefined && growth > 0 && (
        <div className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full mt-0.5">
          <TrendingUp className="w-2.5 h-2.5" />
          +{growth}%
        </div>
      )}
      {subValue && (
        <div className="text-[9px] text-slate-600 mt-0.5">{subValue}</div>
      )}
      <div className="text-[10px] text-slate-600 uppercase tracking-wide mt-1">{label}</div>
    </motion.div>
  );
}

function MiniStatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="bg-white/80 rounded-lg p-2 text-center border border-slate-200/60">
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-slate-600">{icon}</span>
        <span className="text-sm font-semibold text-slate-700">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
