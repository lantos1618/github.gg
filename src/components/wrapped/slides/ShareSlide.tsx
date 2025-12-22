'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';
import { Button } from '@/components/ui/button';
import { Copy, Check, Code, Share2, ExternalLink } from 'lucide-react';
import type { WrappedData } from '@/lib/types/wrapped';
import { cn } from '@/lib/utils';

interface ShareSlideProps {
  data: WrappedData;
}

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

  return (
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#fdf4ff"
      gradientTo="#eff6ff"
    >
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            That&apos;s a wrap! 🎁
          </h2>
          <p className="text-gray-600">Share your coding journey with the world</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">@{data.username}&apos;s {data.year}</p>
              <p className="text-2xl font-bold text-gray-900">GitHub Wrapped</p>
            </div>
            <div className="text-4xl">
              {data.aiInsights?.personalityEmoji || '🎁'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SummaryCard
              value={data.stats.totalCommits}
              label="Commits"
              color="from-green-400 to-emerald-500"
            />
            <SummaryCard
              value={data.stats.totalPRs}
              label="PRs"
              color="from-purple-400 to-pink-500"
            />
            <SummaryCard
              value={data.stats.longestStreak}
              label="Day Streak"
              color="from-orange-400 to-red-500"
            />
          </div>

          {data.aiInsights?.personalityType && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Personality</p>
              <p className="text-lg font-semibold text-gray-900">{data.aiInsights.personalityType}</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleTwitterShare}
              className="h-12 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share on X
            </Button>
            <Button
              onClick={handleLinkedInShare}
              className="h-12 bg-[#0A66C2] hover:bg-[#094d92] text-white"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              LinkedIn
            </Button>
          </div>

          <Button
            onClick={() => handleCopy('link', shareUrl)}
            variant="outline"
            className="w-full h-12 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700"
          >
            {copied === 'link' ? (
              <>
                <Check className="w-5 h-5 mr-2 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Button
            onClick={() => setShowBadgeCode(!showBadgeCode)}
            variant="ghost"
            className="w-full text-gray-600 hover:text-gray-900"
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

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-500 text-sm pt-4"
        >
          See you in {data.year + 1}! 👋
        </motion.p>
      </div>
    </WrappedSlide>
  );
}

function SummaryCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
      <div className={cn('text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent', color)}>
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}
