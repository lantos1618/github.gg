'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';

interface IntroSlideProps {
  year: number;
  username: string;
  avatarUrl?: string;
}

const DRAMATIC_LINES = [
  'You wrote code this year.',
  'Some of it was... interesting.',
  "Let's talk about it.",
];

export function IntroSlide({ year, username, avatarUrl }: IntroSlideProps) {
  const [phase, setPhase] = useState<'year' | 'shatter' | 'lines' | 'ready'>('year');
  const [currentLine, setCurrentLine] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('shatter'), 1200),
      setTimeout(() => setPhase('lines'), 2000),
      setTimeout(() => setCurrentLine(1), 3000),
      setTimeout(() => setCurrentLine(2), 4000),
      setTimeout(() => setPhase('ready'), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const fragments = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    char: ['<', '/', '>', '{', '}', '(', ')', ';', '=', '+', '-', '*', '0', '1', 'fn', 'if', '[]'][Math.floor(Math.random() * 17)],
    x: (Math.random() - 0.5) * 400,
    y: (Math.random() - 0.5) * 400,
    rotation: Math.random() * 720 - 360,
    scale: Math.random() * 0.5 + 0.3,
    delay: Math.random() * 0.2,
  }));

  const userAvatarUrl = avatarUrl || `https://avatars.githubusercontent.com/${username}`;

  return (
    <WrappedSlide glowPosition="center">
      <div className="text-center space-y-8 relative min-h-[70vh] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {(phase === 'year' || phase === 'shatter') && (
            <motion.div
              key="year"
              className="relative"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.h1
                initial={{ opacity: 0, scale: 0.3, rotateX: 90 }}
                animate={{
                  opacity: phase === 'shatter' ? 0 : 1,
                  scale: phase === 'shatter' ? 2 : 1,
                  rotateX: 0,
                }}
                transition={{
                  duration: phase === 'shatter' ? 0.4 : 0.8,
                  type: 'spring',
                  stiffness: 100,
                }}
                className="text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
                style={{
                  filter: 'drop-shadow(0 0 60px rgba(139, 92, 246, 0.3))',
                }}
              >
                {year}
              </motion.h1>

              {phase === 'shatter' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {fragments.map((fragment) => (
                    <motion.span
                      key={fragment.id}
                      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                      animate={{
                        opacity: 0,
                        x: fragment.x,
                        y: fragment.y,
                        rotate: fragment.rotation,
                        scale: fragment.scale,
                      }}
                      transition={{
                        duration: 0.6,
                        delay: fragment.delay,
                        ease: 'easeOut',
                      }}
                      className="absolute text-xl md:text-3xl font-mono text-violet-500/60"
                    >
                      {fragment.char}
                    </motion.span>
                  ))}
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 blur-[100px] bg-violet-500/15 -z-10"
              />
            </motion.div>
          )}

          {(phase === 'lines' || phase === 'ready') && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-10"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="relative"
                >
                  <img
                    src={userAvatarUrl}
                    alt={username}
                    width={96}
                    height={96}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white ring-4 ring-violet-500/20 shadow-xl"
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-violet-400/30"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-violet-600 text-lg font-semibold"
                >
                  @{username}
                </motion.p>
              </motion.div>

              <div className="space-y-3 min-h-[100px]">
                {DRAMATIC_LINES.slice(0, currentLine + 1).map((line, index) => (
                  <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 0.05 * index, duration: 0.4 }}
                    className={`text-xl md:text-2xl ${
                      index === DRAMATIC_LINES.length - 1
                        ? 'text-slate-800 font-semibold'
                        : index === 1
                        ? 'text-slate-500 italic'
                        : 'text-slate-600'
                    }`}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white/80 border border-slate-200/60 backdrop-blur-sm shadow-lg"
              >
                <span className="text-3xl md:text-4xl font-black bg-gradient-to-br from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  {year}
                </span>
                <div className="text-left">
                  <p className="text-slate-800 font-semibold">GitHub Wrapped</p>
                  <p className="text-slate-500 text-sm">Your year in review</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating code symbols */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-violet-500/20 font-mono text-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.1, 0.25, 0.1],
              }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            >
              {['<>', '//', '{}', '[]', '()', '=>', '&&', '||'][Math.floor(Math.random() * 8)]}
            </motion.div>
          ))}
        </div>
      </div>
    </WrappedSlide>
  );
}
