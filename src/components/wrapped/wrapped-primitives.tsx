'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UserHeaderProps, SlideCardProps, StatPillProps } from './wrapped-theme';

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
