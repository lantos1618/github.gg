'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide, SlideCard, AIBadge, UserHeader, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';
import type { WrappedStats, WrappedAIInsights } from '@/lib/types/wrapped';

interface LanguagesSlideProps {
  languages: WrappedStats['languages'];
  user?: { username: string; avatarUrl: string };
  aiInsights?: WrappedAIInsights | null;
}

// GitHub's official language colors
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Scala: '#c22d40',
  Shell: '#89e051',
  Bash: '#89e051',
  PowerShell: '#012456',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Dart: '#00B4AB',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Lua: '#000080',
  Perl: '#0298c3',
  R: '#198CE7',
  Julia: '#a270ba',
  Clojure: '#db5855',
  Erlang: '#B83998',
  OCaml: '#3be133',
  Zig: '#ec915c',
  Nim: '#ffc200',
  Crystal: '#000100',
  'Objective-C': '#438eff',
  Assembly: '#6E4C13',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  YAML: '#cb171e',
  JSON: '#292929',
  Markdown: '#083fa1',
  SQL: '#e38c00',
  GraphQL: '#e10098',
  Solidity: '#AA6746',
  Move: '#4a137a',
  Cairo: '#ff4400',
  Nix: '#7e7eff',
  Terraform: '#5c4ee5',
  HCL: '#844FBA',
};

const getLanguageColor = (name: string): string => {
  return LANGUAGE_COLORS[name] || '#6e7681'; // Default gray for unknown languages
};

const FALLBACK_ROASTS: Record<string, string> = {
  JavaScript: 'Embrace the chaos.',
  TypeScript: 'You value your sanity. Rare.',
  Python: 'Life is too short for curly braces.',
  Rust: 'You enjoy suffering but in a sophisticated way.',
  Go: 'if err != nil { panic() }',
  Java: 'The enterprise runs through your veins.',
  C: 'You have seen things. Segfaults. Memory leaks. Pain.',
  'C++': 'You have seen things. Segfaults. Memory leaks. Pain.',
  PHP: 'Brave of you to admit this publicly.',
  Ruby: '2015 called, they want their language back.',
  Swift: 'Apple fan detected.',
  Kotlin: 'The civilized Android developer.',
  Shell: 'You speak to machines directly.',
  HTML: 'Yes, it counts. We said what we said.',
  CSS: 'Centering divs is a personality trait.',
  Vue: 'Template gang rise up.',
  Svelte: 'A person of culture, I see.',
};

export function LanguagesSlide({ languages, user, aiInsights }: LanguagesSlideProps) {
  const [animationComplete, setAnimationComplete] = useState(false);
  const topLanguage = languages[0];
  const fallbackRoast = topLanguage ? FALLBACK_ROASTS[topLanguage.name] : null;

  const hasAICodingJourney = !!aiInsights?.codingJourney;
  const displayMessage = aiInsights?.codingJourney || fallbackRoast;

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const isPolyglot = languages.length >= 4;
  const languageSpread = languages.length > 1
    ? Math.abs(languages[0].percentage - languages[1].percentage)
    : 100;
  const isSpecialist = languageSpread > 40;

  return (
    <WrappedSlide glowPosition="center">
      <div className="space-y-8">
        {user && (
          <div className="flex justify-center mb-4">
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </div>
        )}

        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${WRAPPED_STYLES.sectionLabel} text-center`}
        >
          Your Languages
        </motion.p>

        {/* Donut Chart */}
        <div className="relative w-full max-w-xs mx-auto aspect-square">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {languages.slice(0, 6).map((lang, index) => {
              const prevPercentages = languages
                .slice(0, index)
                .reduce((sum, l) => sum + l.percentage, 0);
              const offset = (prevPercentages / 100) * 314.159;
              const length = (lang.percentage / 100) * 314.159;
              const isPrimary = index === 0;

              const color = getLanguageColor(lang.name);
              return (
                <motion.circle
                  key={lang.name}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={color}
                  strokeWidth="16"
                  strokeDasharray={`${length} 314.159`}
                  strokeDashoffset={-offset}
                  initial={{ strokeDasharray: '0 314.159' }}
                  animate={{ strokeDasharray: `${length} 314.159` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3 + index * 0.15,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  style={{
                    filter: isPrimary ? `drop-shadow(0 0 8px ${color}80)` : undefined,
                  }}
                />
              );
            })}
          </svg>

          {/* Center text */}
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
                    className="text-3xl md:text-4xl font-black"
                    style={{ color: getLanguageColor(topLanguage.name) }}
                  >
                    {topLanguage.name}
                  </div>
                  <div className="text-slate-500 text-sm mt-1">
                    {topLanguage.percentage.toFixed(1)}%
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Language pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: animationComplete ? 1 : 0, y: animationComplete ? 0 : 20 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap justify-center gap-2">
            {languages.slice(0, 6).map((lang, index) => {
              const color = getLanguageColor(lang.name);
              return (
                <motion.div
                  key={lang.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.8 + index * 0.1 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm bg-white/80 border-slate-200/60"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    {lang.name}
                  </span>
                  <span className="text-xs text-slate-500">{lang.percentage.toFixed(0)}%</span>
                </motion.div>
              );
            })}
          </div>

          {/* Polyglot/Specialist badge */}
          {(isPolyglot || isSpecialist) && !hasAICodingJourney && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.3 }}
              className="flex justify-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-slate-200/60 shadow-sm">
                <span className="text-sm font-medium text-slate-700">
                  {isPolyglot ? `Polyglot: ${languages.length} languages` : `${topLanguage?.name} Specialist`}
                </span>
              </div>
            </motion.div>
          )}

          {/* AI or fallback message */}
          {displayMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
            >
              <SlideCard glow={hasAICodingJourney} className="max-w-md mx-auto text-center">
                {hasAICodingJourney && <AIBadge className="mb-3" />}
                <p className={`text-slate-700 ${hasAICodingJourney ? 'text-base leading-relaxed' : 'text-lg'}`}>
                  {displayMessage}
                </p>
              </SlideCard>
            </motion.div>
          )}
        </motion.div>
      </div>
    </WrappedSlide>
  );
}
