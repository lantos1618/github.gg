'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as React from 'react';

/**
 * Wrapped Design System - Light Mode
 * ===================================
 *
 * DESIGN PHILOSOPHY:
 * A sophisticated, shareable light theme designed for developers.
 * Feels celebratory and premium - perfect for social media sharing.
 * Uses a violet/purple accent that feels modern and achievement-oriented.
 *
 * COLOR PALETTE:
 * - Background: Warm off-white gradient (#FFFBF8 → #F8F7FF)
 * - Surface: Pure white with soft shadows
 * - Text Primary: Deep slate (#1E293B)
 * - Text Secondary: Medium slate (#64748B)
 * - Text Muted: Light slate (#94A3B8)
 * - Accent: Violet gradient (#8B5CF6 → #6366F1)
 * - Accent Glow: violet-500/15 for subtle highlights
 *
 * SEMANTIC COLORS:
 * - Success: Emerald (#10B981) - grades A, positive growth
 * - Warning: Amber (#F59E0B) - trauma, security warnings
 * - Error: Rose (#F43F5E) - grade F, critical issues
 *
 * TYPOGRAPHY SCALE:
 * - Hero (dramatic): text-[10rem] md:text-[14rem] - IntroSlide year only
 * - Hero (stats): text-7xl md:text-[8rem] - commit counts, grades
 * - Hero (secondary): text-3xl md:text-4xl - personality names, years
 * - Title: text-2xl md:text-3xl - section titles
 * - Body emphasis: text-lg md:text-xl
 * - Body: text-base
 * - Small: text-sm
 * - Label: text-xs uppercase tracking-[0.3em] font-medium
 *
 * SPACING HIERARCHY:
 * - Main content: space-y-8 (hero/dramatic slides)
 * - Dense content: space-y-6 (info-heavy slides)
 * - Card groups: space-y-4
 * - Within cards: space-y-2 or space-y-3
 *
 * ANIMATION EASING:
 * - Standard: [0.25, 0.46, 0.45, 0.94] (ease-out-quad)
 * - Spring: { type: 'spring', stiffness: 200, damping: 15 }
 */

export const WRAPPED_THEME = {
  // Backgrounds - warm light gradient
  bgPrimary: '#FFFBF8',
  bgSecondary: '#F8F7FF',
  bgSurface: 'rgba(255, 255, 255, 0.8)',
  bgSurfaceSolid: '#FFFFFF',

  // Accent - Violet/Purple (feels celebratory & modern)
  accent: '#8B5CF6',
  accentLight: '#A78BFA',
  accentDark: '#7C3AED',
  accentGlow: 'rgba(139, 92, 246, 0.15)',
  accentSubtle: 'rgba(139, 92, 246, 0.08)',

  // Gradient for special elements
  accentGradient: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',

  // Text - slate colors for warmth
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  // Borders - subtle and soft
  border: 'rgba(148, 163, 184, 0.2)',
  borderLight: 'rgba(148, 163, 184, 0.1)',

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#F43F5E',
} as const;

// Reusable style constants for consistency
export const WRAPPED_STYLES = {
  // Section label style - use for all slide headers
  sectionLabel: 'text-xs uppercase tracking-[0.3em] text-slate-500 font-medium',

  // Hero number styles
  heroStat: 'text-7xl md:text-[8rem] font-black tabular-nums leading-none',
  heroSecondary: 'text-3xl md:text-4xl font-black',

  // Animation presets
  standardEasing: [0.25, 0.46, 0.45, 0.94] as const,
  springConfig: { type: 'spring' as const, stiffness: 200, damping: 15 },
} as const;

export interface UserHeaderProps {
  username: string;
  avatarUrl: string;
}

export function UserHeader({ username, avatarUrl, className }: UserHeaderProps & { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-center gap-3', className)}
    >
      <motion.img
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        src={avatarUrl}
        alt={username}
        className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-slate-200 shadow-lg ring-2 ring-violet-500/20"
      />
      <motion.p
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="text-sm font-medium text-slate-700"
      >
        @{username}
      </motion.p>
    </motion.div>
  );
}

interface WrappedSlideProps {
  children: ReactNode;
  className?: string;
  showGrid?: boolean;
  glowPosition?: 'top' | 'center' | 'bottom' | 'none';
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

export function WrappedSlide({
  children,
  className,
  showGrid = true,
  glowPosition = 'center',
}: WrappedSlideProps) {
  return (
    <motion.div
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={slideTransition}
      className={cn(
        'relative w-full h-full flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden',
        'bg-gradient-to-br from-[#FFFBF8] via-[#FDF8FF] to-[#F8F7FF]',
        className
      )}
    >
      {/* Subtle dot pattern for texture */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(139, 92, 246, 0.08) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {/* Violet accent glow - soft and warm */}
      {glowPosition !== 'none' && (
        <div
          className={cn(
            'absolute w-[800px] h-[800px] rounded-full blur-[200px] pointer-events-none',
            'bg-gradient-to-br from-violet-400/10 to-indigo-400/10',
            glowPosition === 'top' && '-top-96 left-1/2 -translate-x-1/2',
            glowPosition === 'center' && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            glowPosition === 'bottom' && '-bottom-96 left-1/2 -translate-x-1/2',
          )}
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {children}
      </div>
    </motion.div>
  );
}

// Reusable card component for consistent styling
interface SlideCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function SlideCard({ children, className, glow = false }: SlideCardProps) {
  return (
    <div
      className={cn(
        'relative bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 shadow-sm',
        glow && 'ring-1 ring-violet-500/20 shadow-violet-100/50',
        className
      )}
    >
      {glow && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

// Accent badge for AI insights
export function AIBadge({ className }: { className?: string }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
      'bg-violet-500/10 border border-violet-500/20',
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
      <span className="text-xs font-medium text-violet-600">AI</span>
    </div>
  );
}

// Stat pill for consistent stat display
interface StatPillProps {
  icon?: ReactNode;
  value: number | string;
  label: string;
  className?: string;
}

export function StatPill({ icon, value, label, className }: StatPillProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5',
      'bg-white/60 border border-slate-200/60 rounded-full shadow-sm',
      className
    )}>
      {icon && <span className="text-violet-500">{icon}</span>}
      <span className="text-sm font-semibold text-slate-800">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
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
  // Violet/purple confetti for celebratory feel
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
