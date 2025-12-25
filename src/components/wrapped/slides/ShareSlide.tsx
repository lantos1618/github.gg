'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';
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
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
];

const gradeColors: Record<string, string> = {
  'A+': 'from-emerald-400 to-green-500',
  'A': 'from-emerald-400 to-green-500',
  'A-': 'from-green-400 to-emerald-500',
  'B+': 'from-blue-400 to-cyan-500',
  'B': 'from-blue-400 to-cyan-500',
  'B-': 'from-cyan-400 to-blue-500',
  'C+': 'from-yellow-400 to-orange-500',
  'C': 'from-yellow-400 to-orange-500',
  'C-': 'from-orange-400 to-yellow-500',
  'D': 'from-orange-400 to-red-500',
  'F': 'from-red-400 to-red-600',
};

export function ShareSlide({ data }: ShareSlideProps) {
  const [copied, setCopied] = useState<'link' | 'badge' | null>(null);
  const [showBadgeCode, setShowBadgeCode] = useState(false);

  const shareUrl = `https://github.gg/wrapped/${data.year}/${data.username}`;
  const twitterText = `My ${data.year} GitHub Wrapped is here! 🎁

📊 ${data.stats.totalCommits.toLocaleString()} commits
💻 Top language: ${data.stats.languages[0]?.name || 'Code'}
${data.aiInsights?.personalityType ? `🎭 Personality: ${data.aiInsights.personalityType}` : ''}

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
    ? gradeColors[data.aiInsights.overallGrade] || 'from-gray-400 to-gray-500'
    : null;

  return (
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#fdf4ff"
      gradientTo="#eff6ff"
    >
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
            That&apos;s a wrap! 🎁
          </h2>
          <p className="text-gray-500 text-sm">Share your coding journey with the world</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg"
        >
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-medium uppercase tracking-wider">Year at a Glance</p>
                <p className="text-white text-xl font-bold">@{data.username} • {data.year}</p>
              </div>
              <div className="flex items-center gap-2">
                {data.aiInsights?.overallGrade && gradeColor && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black',
                      'bg-white/20 backdrop-blur-sm text-white shadow-lg'
                    )}
                  >
                    {data.aiInsights.overallGrade}
                  </motion.div>
                )}
                <div className="text-4xl">
                  {data.aiInsights?.personalityEmoji || '🎁'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                icon={<Zap className="w-3.5 h-3.5" />}
                value={data.stats.totalCommits}
                label="Commits"
                color="from-green-400 to-emerald-500"
                growth={data.stats.growthPercentage}
                delay={0.2}
              />
              <StatCard
                icon={<GitPullRequest className="w-3.5 h-3.5" />}
                value={data.stats.totalPRs}
                label="PRs"
                subValue={`${mergeRate}% merged`}
                color="from-purple-400 to-pink-500"
                delay={0.25}
              />
              <StatCard
                icon={<Flame className="w-3.5 h-3.5" />}
                value={data.stats.longestStreak}
                label="Day Streak"
                color="from-orange-400 to-red-500"
                delay={0.3}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniStatCard
                icon={<Clock className="w-3 h-3" />}
                value={peakHourLabel}
                label="Peak Hour"
                delay={0.35}
              />
              <MiniStatCard
                icon={<Moon className="w-3 h-3" />}
                value={data.stats.lateNightCommits}
                label="Late Night"
                delay={0.4}
              />
              <MiniStatCard
                icon={<Calendar className="w-3 h-3" />}
                value={data.stats.weekendCommits}
                label="Weekend"
                delay={0.45}
              />
            </div>

            <div className="flex gap-2">
              {topLanguage && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm" 
                      style={{ backgroundColor: topLanguage.color || '#8b949e' }}
                    />
                    <span className="text-sm font-semibold text-gray-800">{topLanguage.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">{topLanguage.percentage}%</span>
                  </div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide mt-1">Top Language</p>
                </motion.div>
              )}
              
              {data.aiInsights?.personalityType && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 }}
                  className="flex-1 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-100"
                >
                  <p className="text-sm font-semibold text-gray-800 truncate">{data.aiInsights.personalityType}</p>
                  <p className="text-[10px] text-purple-500 uppercase tracking-wide mt-1">Personality</p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleTwitterShare}
              className="h-11 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-medium"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share on X
            </Button>
            <Button
              onClick={handleLinkedInShare}
              className="h-11 bg-[#0A66C2] hover:bg-[#094d92] text-white font-medium"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              LinkedIn
            </Button>
          </div>

          <Button
            onClick={() => handleCopy('link', shareUrl)}
            variant="outline"
            className="w-full h-11 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700"
          >
            {copied === 'link' ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-500" />
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-2"
        >
          <Button
            onClick={() => setShowBadgeCode(!showBadgeCode)}
            variant="ghost"
            className="w-full text-gray-500 hover:text-gray-700 text-sm"
          >
            <Code className="w-4 h-4 mr-2" />
            Add badge to your README
          </Button>

          {showBadgeCode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-200"
            >
              <div>
                <p className="text-xs text-gray-500 mb-2">Markdown</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-gray-100 p-2 rounded font-mono text-gray-700 overflow-x-auto">
                    {badgeMarkdown}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy('badge', badgeMarkdown)}
                    className="shrink-0"
                  >
                    {copied === 'badge' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">HTML</p>
                <code className="block text-xs bg-gray-100 p-2 rounded font-mono text-gray-700 overflow-x-auto">
                  {badgeHtml}
                </code>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="pt-2"
        >
          <Link href={`/${data.username}`} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              className="w-full h-11 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 font-medium"
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
          className="text-center text-gray-400 text-xs pt-2"
        >
          See you in {data.year + 1}! 👋
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
  color,
  growth,
  delay = 0,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  subValue?: string;
  color: string;
  growth?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', color)}>
            {icon}
          </span>
        </div>
        <div className={cn('text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent', color)}>
          {value.toLocaleString()}
        </div>
        {growth !== undefined && growth > 0 && (
          <div className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-0.5">
            <TrendingUp className="w-2.5 h-2.5" />
            +{growth}%
          </div>
        )}
        {subValue && (
          <div className="text-[9px] text-gray-600 mt-0.5">{subValue}</div>
        )}
        <div className="text-[10px] text-gray-700 uppercase tracking-wide mt-1">{label}</div>
      </div>
    </motion.div>
  );
}

function MiniStatCard({
  icon,
  value,
  label,
  delay = 0,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gray-50/50 rounded-lg p-2 text-center border border-gray-100"
    >
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm font-semibold text-gray-700">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      <div className="text-[9px] text-gray-600 uppercase tracking-wide mt-0.5">{label}</div>
    </motion.div>
  );
}
