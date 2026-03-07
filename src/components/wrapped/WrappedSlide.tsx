'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Re-export split modules for backwards compatibility
export { WRAPPED_THEME, WRAPPED_STYLES } from './wrapped-theme';
export type { UserHeaderProps, SlideCardProps, StatPillProps, AnimatedCounterProps, StaggeredTextProps } from './wrapped-theme';
export { UserHeader, SlideCard, AIBadge, StatPill } from './wrapped-primitives';
export { AnimatedCounter, StaggeredText, Confetti } from './wrapped-animations';

interface WrappedSlideProps {
  children: ReactNode;
  className?: string;
  showGrid?: boolean;
  glowPosition?: 'top' | 'center' | 'bottom' | 'none';
  'data-testid'?: string;
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
  'data-testid': dataTestId,
}: WrappedSlideProps) {
  return (
    <motion.div
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={slideTransition}
      data-testid={dataTestId}
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
