/**
 * Cracked badge tier system
 *
 * - 90+: Red (god tier)
 * - 85-89: Gold
 * - 80-84: Silver (entry to the club)
 */

export type CrackedTier = 'elite' | 'gold' | 'silver' | 'special' | null;

export interface CrackedInfo {
  isCracked: boolean;
  tier: CrackedTier;
  colors: {
    bg: string;
    bgHover: string;
    border: string;
    ring: string;
    text: string;
    bgLight: string;
    borderLight: string;
    textLight: string;
  };
}

const TIER_COLORS = {
  elite: {
    bg: 'bg-red-500',
    bgHover: 'hover:bg-red-600',
    border: 'border-red-500',
    ring: 'ring-red-500/20',
    text: 'text-red-500',
    bgLight: 'bg-red-50',
    borderLight: 'border-red-200',
    textLight: 'text-red-800',
  },
  gold: {
    bg: 'bg-yellow-500',
    bgHover: 'hover:bg-yellow-600',
    border: 'border-yellow-500',
    ring: 'ring-yellow-500/20',
    text: 'text-yellow-500',
    bgLight: 'bg-yellow-50',
    borderLight: 'border-yellow-200',
    textLight: 'text-yellow-800',
  },
  silver: {
    bg: 'bg-slate-400',
    bgHover: 'hover:bg-slate-500',
    border: 'border-slate-400',
    ring: 'ring-slate-400/20',
    text: 'text-slate-400',
    bgLight: 'bg-slate-100',
    borderLight: 'border-slate-300',
    textLight: 'text-slate-700',
  },
  special: {
    bg: 'bg-pink-400',
    bgHover: 'hover:bg-pink-500',
    border: 'border-pink-400',
    ring: 'ring-pink-400/30',
    text: 'text-pink-400',
    bgLight: 'bg-pink-50',
    borderLight: 'border-pink-200',
    textLight: 'text-pink-800',
  },
};

const DEFAULT_COLORS = {
  bg: 'bg-gray-200',
  bgHover: 'hover:bg-gray-300',
  border: 'border-gray-200',
  ring: '',
  text: 'text-gray-500',
  bgLight: 'bg-gray-50',
  borderLight: 'border-gray-200',
  textLight: 'text-gray-900',
};

/**
 * Get cracked tier and styling info for a given score
 */
export function getCrackedInfo(score: number, username?: string): CrackedInfo {
  const isSpecial = username?.toLowerCase() === 'knottedbrains';

  if (isSpecial) {
    return {
      isCracked: true,
      tier: 'special',
      colors: TIER_COLORS.special,
    };
  }

  if (score >= 90) {
    return {
      isCracked: true,
      tier: 'elite',
      colors: TIER_COLORS.elite,
    };
  }

  if (score >= 85) {
    return {
      isCracked: true,
      tier: 'gold',
      colors: TIER_COLORS.gold,
    };
  }

  if (score >= 80) {
    return {
      isCracked: true,
      tier: 'silver',
      colors: TIER_COLORS.silver,
    };
  }

  return {
    isCracked: false,
    tier: null,
    colors: DEFAULT_COLORS,
  };
}

/**
 * Get just the badge class names for the cracked badge
 */
export function getCrackedBadgeClasses(score: number, username?: string): string {
  const { isCracked, colors } = getCrackedInfo(score, username);
  if (!isCracked) return '';
  return `${colors.bg} ${colors.bgHover} text-white border-none`;
}
