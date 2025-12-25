'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type SlideVariant = 'dark' | 'gradient' | 'accent' | 'neon';

interface UserHeaderProps {
  username: string;
  avatarUrl: string;
}

interface WrappedSlideProps {
  children: ReactNode;
  variant?: SlideVariant;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientVia?: string;
  user?: UserHeaderProps;
}

const slideVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.98 },
};

const slideTransition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

const variantStyles: Record<SlideVariant, string> = {
  dark: 'bg-white text-gray-900',
  gradient: 'bg-gradient-to-br from-white via-gray-50 to-blue-50 text-gray-900',
  accent: 'bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f97316] text-white',
  neon: 'bg-gradient-to-br from-purple-50 via-white to-cyan-50 text-gray-900',
};

export function WrappedSlide({
  children,
  variant = 'dark',
  className,
  gradientFrom,
  gradientTo,
  gradientVia,
  user,
}: WrappedSlideProps) {
  const customGradient = gradientFrom && gradientTo
    ? `bg-gradient-to-br from-[${gradientFrom}] ${gradientVia ? `via-[${gradientVia}]` : ''} to-[${gradientTo}]`
    : '';

  return (
    <motion.div
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={slideTransition}
      className={cn(
        'relative w-full h-full flex flex-col items-center justify-center p-8 md:p-12 overflow-hidden',
        customGradient || variantStyles[variant],
        className
      )}
      style={
        gradientFrom && gradientTo
          ? {
              background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientVia || gradientFrom} 50%, ${gradientTo} 100%)`,
            }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
      
      {variant === 'neon' && (
        <>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-200/40 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </>
      )}
      
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-4 flex items-center gap-2"
          >
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-8 h-8 rounded-full border-2 border-white/80 shadow-sm"
            />
            <span className="text-sm font-medium text-gray-700 opacity-80">@{user.username}</span>
          </motion.div>
        )}
        {children}
      </div>
    </motion.div>
  );
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

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

import * as React from 'react';

interface StaggeredTextProps {
  text: string;
  className?: string;
  delayPerChar?: number;
  initialDelay?: number;
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
  const colors = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    size: Math.random() * 8 + 4,
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
            x: [0, (Math.random() - 0.5) * 200],
          }}
          transition={{
            duration: 3,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
