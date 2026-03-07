'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AnimatedCounterProps, StaggeredTextProps } from './wrapped-theme';

export function AnimatedCounter({
  value,
  duration = 1.5,
  className,
  suffix = '',
  prefix = '',
}: AnimatedCounterProps) {
  return (
    <motion.span
      className={cn('tabular-nums', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {prefix}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {(() => {
          const Counter = () => {
            const [count, setCount] = React.useState(0);
            React.useEffect(() => {
              const step = value / (duration * 60);
              let current = 0;
              const timer = setInterval(() => {
                current += step;
                if (current >= value) {
                  setCount(value);
                  clearInterval(timer);
                } else {
                  setCount(Math.floor(current));
                }
              }, 1000 / 60);
              return () => clearInterval(timer);
            }, []);
            return count.toLocaleString();
          };
          return <Counter />;
        })()}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: duration }}
      >
        {suffix}
      </motion.span>
    </motion.span>
  );
}

export function StaggeredText({
  text,
  className,
  delayPerChar = 0.03,
  initialDelay = 0,
}: StaggeredTextProps) {
  return (
    <span className={className}>
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: initialDelay + index * delayPerChar,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

export function Confetti() {
  const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#6366F1', '#818CF8', '#F472B6'];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    size: Math.random() * 6 + 3,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: '100vh',
            opacity: [1, 1, 0],
            rotate: p.rotation + 720,
            x: [0, (Math.random() - 0.5) * 150],
          }}
          transition={{
            duration: 2.5,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
