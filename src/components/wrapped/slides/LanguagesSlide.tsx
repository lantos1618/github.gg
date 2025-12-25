'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide, UserHeader } from '../WrappedSlide';
import type { WrappedStats, WrappedAIInsights } from '@/lib/types/wrapped';

interface LanguagesSlideProps {
  languages: WrappedStats['languages'];
  user?: { username: string; avatarUrl: string };
  aiInsights?: WrappedAIInsights | null;
}

const FALLBACK_ROASTS: Record<string, { message: string; emoji: string }> = {
  JavaScript: { message: 'Embrace the chaos.', emoji: '💛' },
  TypeScript: { message: 'You value your sanity. Rare.', emoji: '💙' },
  Python: { message: "Life's too short for curly braces.", emoji: '🐍' },
  Rust: { message: 'You enjoy suffering but in a sophisticated way.', emoji: '🦀' },
  Go: { message: 'if err != nil { panic() }', emoji: '🐹' },
  Java: { message: 'The enterprise runs through your veins.', emoji: '☕' },
  C: { message: "You've seen things. Segfaults. Memory leaks. Pain.", emoji: '⚙️' },
  'C++': { message: "You've seen things. Segfaults. Memory leaks. Pain.", emoji: '⚙️' },
  PHP: { message: 'Brave of you to admit this publicly.', emoji: '🐘' },
  Ruby: { message: '2015 called, they want their language back.', emoji: '💎' },
  Swift: { message: 'Apple fan detected.', emoji: '🍎' },
  Kotlin: { message: 'The civilized Android developer.', emoji: '🤖' },
  Shell: { message: 'You speak to machines directly.', emoji: '🐚' },
  HTML: { message: 'Yes, it counts. We said what we said.', emoji: '📄' },
  CSS: { message: 'Centering divs is a personality trait.', emoji: '🎨' },
  Vue: { message: 'Template gang rise up.', emoji: '💚' },
  Svelte: { message: 'A person of culture, I see.', emoji: '🧡' },
};

export function LanguagesSlide({ languages, user, aiInsights }: LanguagesSlideProps) {
  const [animationComplete, setAnimationComplete] = useState(false);
  const topLanguage = languages[0];
  const fallbackRoast = topLanguage ? FALLBACK_ROASTS[topLanguage.name] : null;
  
  const hasAICodingJourney = !!aiInsights?.codingJourney;
  const displayMessage = aiInsights?.codingJourney || fallbackRoast?.message;
  const displayEmoji = fallbackRoast?.emoji || '💻';

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const isPolyglot = languages.length >= 4;
  const topTwo = languages.slice(0, 2);
  const languageSpread = languages.length > 1 
    ? Math.abs(languages[0].percentage - languages[1].percentage) 
    : 100;
  const isSpecialist = languageSpread > 40;

  return (
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#fefce8"
      gradientTo="#ecfdf5"
    >
      <div className="space-y-8">
        {user && (
          <div className="flex justify-center mb-4">
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </div>
        )}
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs uppercase tracking-[0.3em] text-gray-500 text-center font-medium"
        >
          Your Languages
        </motion.p>

        <div className="relative w-full max-w-sm mx-auto aspect-square">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {languages.slice(0, 6).map((lang, index) => {
              const prevPercentages = languages
                .slice(0, index)
                .reduce((sum, l) => sum + l.percentage, 0);
              const offset = (prevPercentages / 100) * 314.159;
              const length = (lang.percentage / 100) * 314.159;

              return (
                <motion.circle
                  key={lang.name}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={lang.color}
                  strokeWidth="18"
                  strokeDasharray={`${length} 314.159`}
                  strokeDashoffset={-offset}
                  initial={{ strokeDasharray: '0 314.159' }}
                  animate={{ strokeDasharray: `${length} 314.159` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3 + index * 0.15,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="drop-shadow-lg"
                />
              );
            })}
          </svg>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              {topLanguage && (
                <>
                  <div
                    className="text-4xl md:text-5xl font-black"
                    style={{ color: topLanguage.color }}
                  >
                    {topLanguage.name}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {topLanguage.percentage.toFixed(1)}%
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: animationComplete ? 1 : 0, y: animationComplete ? 0 : 20 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap justify-center gap-2">
            {languages.slice(0, 6).map((lang, index) => (
              <motion.div
                key={lang.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.8 + index * 0.1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: lang.color }}
                />
                <span className="text-sm text-gray-700">{lang.name}</span>
                <span className="text-xs text-gray-500">{lang.percentage.toFixed(0)}%</span>
              </motion.div>
            ))}
          </div>

          {(isPolyglot || isSpecialist) && !hasAICodingJourney && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.3 }}
              className="flex justify-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200">
                <span className="text-lg">{isPolyglot ? '🗣️' : '🎯'}</span>
                <span className="text-sm font-medium text-purple-700">
                  {isPolyglot ? `Polyglot: ${languages.length} languages!` : `${topLanguage?.name} Specialist`}
                </span>
              </div>
            </motion.div>
          )}

          {displayMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="text-center space-y-2 pt-4"
            >
              {hasAICodingJourney && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mb-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  AI Analysis
                </motion.div>
              )}
              <p className="text-2xl">{displayEmoji}</p>
              <p className={`text-gray-700 max-w-md mx-auto ${hasAICodingJourney ? 'text-base leading-relaxed' : 'text-lg'}`}>
                {displayMessage}
              </p>
            </motion.div>
          )}

          {topTwo.length > 1 && !hasAICodingJourney && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.8 }}
              className="text-center text-gray-500 text-sm"
            >
              {topTwo[0].name} and {topTwo[1].name} made up{' '}
              <span className="font-semibold text-gray-700">
                {(topTwo[0].percentage + topTwo[1].percentage).toFixed(0)}%
              </span>{' '}
              of your code
            </motion.p>
          )}
        </motion.div>
      </div>
    </WrappedSlide>
  );
}
