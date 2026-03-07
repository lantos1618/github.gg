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
 * - Background: Warm off-white gradient (#FFFBF8 -> #F8F7FF)
 * - Surface: Pure white with soft shadows
 * - Text Primary: Deep slate (#1E293B)
 * - Text Secondary: Medium slate (#64748B)
 * - Text Muted: Light slate (#94A3B8)
 * - Accent: Violet gradient (#8B5CF6 -> #6366F1)
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

export interface SlideCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export interface StatPillProps {
  icon?: React.ReactNode;
  value: number | string;
  label: string;
  className?: string;
}

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export interface StaggeredTextProps {
  text: string;
  className?: string;
  delayPerChar?: number;
  initialDelay?: number;
}
