'use client';

import { motion } from 'framer-motion';
import { WrappedSlide, StaggeredText } from '../WrappedSlide';

interface IntroSlideProps {
  username: string;
  year: number;
}

export function IntroSlide({ username, year }: IntroSlideProps) {
  return (
    <WrappedSlide variant="neon">
      <div className="text-center space-y-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
          className="relative inline-block"
        >
          <span className="text-8xl md:text-[12rem] font-black bg-gradient-to-br from-gray-900 via-purple-600 to-cyan-600 bg-clip-text text-transparent leading-none">
            {year}
          </span>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute -inset-4 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-cyan-500/30 blur-3xl -z-10"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="space-y-4"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
            <StaggeredText text="Your Year in Code" delayPerChar={0.04} initialDelay={0.8} />
          </h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xl text-gray-600"
          >
            @{username}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="pt-8"
        >
          <motion.p
            className="text-gray-600 text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Tap to continue
          </motion.p>
        </motion.div>
      </div>

      <GlitchLines />
    </WrappedSlide>
  );
}

function GlitchLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent"
          style={{ top: `${20 + i * 15}%` }}
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '100%', opacity: [0, 1, 0] }}
          transition={{
            duration: 1.5,
            delay: 0.5 + i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
