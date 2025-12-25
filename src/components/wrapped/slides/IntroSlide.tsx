'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';

interface IntroSlideProps {
  year: number;
  username: string;
  avatarUrl?: string;
}

const DRAMATIC_LINES = [
  "You wrote code this year.",
  "Some of it was... interesting.",
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
    <WrappedSlide
      gradientFrom="#030712"
      gradientVia="#0f172a"
      gradientTo="#030712"
    >
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
                className="text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter"
                style={{ 
                  background: 'linear-gradient(180deg, #ffffff 0%, #a855f7 50%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 60px rgba(168, 85, 247, 0.5))',
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
                      className="absolute text-xl md:text-3xl font-mono text-purple-400/80"
                    >
                      {fragment.char}
                    </motion.span>
                  ))}
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 blur-[100px] bg-gradient-to-r from-purple-600/40 via-pink-500/40 to-indigo-600/40 -z-10"
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
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-purple-500/50"
                    style={{ boxShadow: '0 0 50px rgba(168, 85, 247, 0.5)' }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-purple-400/50"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-purple-300 text-xl font-medium"
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
                    className={`text-2xl md:text-3xl ${
                      index === DRAMATIC_LINES.length - 1 
                        ? 'text-white font-bold' 
                        : index === 1 
                        ? 'text-gray-400 italic'
                        : 'text-gray-300'
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
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 backdrop-blur-sm"
              >
                <span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                  {year}
                </span>
                <div className="text-left">
                  <p className="text-white font-semibold text-lg">GitHub Wrapped</p>
                  <p className="text-purple-300 text-sm">Your year in review</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-purple-500/20 font-mono text-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.1, 0.3, 0.1],
                rotate: [0, 10, 0],
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

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-full h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"
              style={{ top: `${30 + i * 20}%` }}
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '200%', opacity: [0, 1, 0] }}
              transition={{
                duration: 2,
                delay: 1 + i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </WrappedSlide>
  );
}
