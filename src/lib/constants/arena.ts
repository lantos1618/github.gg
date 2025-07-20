// Arena Battle Constants
export const DEFAULT_BATTLE_CRITERIA = [
  'code_quality',
  'project_complexity', 
  'skill_diversity',
  'innovation',
  'documentation',
  'testing',
  'architecture'
] as const;

export const ALL_BATTLE_CRITERIA = [
  'code_quality',
  'project_complexity', 
  'skill_diversity',
  'innovation',
  'documentation',
  'testing',
  'architecture',
  'performance',
  'security',
  'maintainability'
] as const;

export const INITIAL_ELO_RATING = 1200;
export const BYOK_DAILY_BATTLE_LIMIT = 3;

export const ELO_TIERS = {
  BRONZE: { name: 'Bronze', minRating: 0 },
  SILVER: { name: 'Silver', minRating: 1200 },
  GOLD: { name: 'Gold', minRating: 1400 },
  PLATINUM: { name: 'Platinum', minRating: 1600 },
  DIAMOND: { name: 'Diamond', minRating: 1800 },
  MASTER: { name: 'Master', minRating: 2000 }
} as const;

export const K_FACTORS = {
  NEW_PLAYER: 40,     // < 30 battles
  MASTER: 16,         // >= 2000 rating
  HIGH_RATED: 24,     // >= 1600 rating
  DEFAULT: 32
} as const; 