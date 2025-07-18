import { z } from 'zod';

// ELO Rating System
export const eloRatingSchema = z.object({
  rating: z.number().min(0),
  wins: z.number().min(0),
  losses: z.number().min(0),
  draws: z.number().min(0),
  totalBattles: z.number().min(0),
  winStreak: z.number().min(0),
  bestWinStreak: z.number().min(0),
  rank: z.number().optional(),
  tier: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master']),
});

export type EloRating = z.infer<typeof eloRatingSchema>;

// Battle Criteria
export const battleCriteriaSchema = z.enum([
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
]);

export type BattleCriteria = z.infer<typeof battleCriteriaSchema>;

// Battle Scores
export const battleScoresSchema = z.object({
  challenger: z.object({
    total: z.number(),
    breakdown: z.object({
      code_quality: z.number(),
      project_complexity: z.number(),
      skill_diversity: z.number(),
      innovation: z.number(),
      documentation: z.number(),
      testing: z.number(),
      architecture: z.number(),
      performance: z.number(),
      security: z.number(),
      maintainability: z.number(),
    }),
  }),
  opponent: z.object({
    total: z.number(),
    breakdown: z.object({
      code_quality: z.number(),
      project_complexity: z.number(),
      skill_diversity: z.number(),
      innovation: z.number(),
      documentation: z.number(),
      testing: z.number(),
      architecture: z.number(),
      performance: z.number(),
      security: z.number(),
      maintainability: z.number(),
    }),
  }),
});

export type BattleScores = z.infer<typeof battleScoresSchema>;

// ELO Change
export const eloChangeSchema = z.object({
  challenger: z.object({
    before: z.number(),
    after: z.number(),
    change: z.number(),
  }),
  opponent: z.object({
    before: z.number(),
    after: z.number(),
    change: z.number(),
  }),
});

export type EloChange = z.infer<typeof eloChangeSchema>;

// Battle Status
export const battleStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export type BattleStatus = z.infer<typeof battleStatusSchema>;

// Battle Type
export const battleTypeSchema = z.enum(['standard', 'tournament', 'friendly']);
export type BattleType = z.infer<typeof battleTypeSchema>;

// Arena Battle
export const arenaBattleSchema = z.object({
  id: z.string(),
  challengerId: z.string(),
  opponentId: z.string(),
  challengerUsername: z.string(),
  opponentUsername: z.string(),
  winnerId: z.string().optional(),
  status: battleStatusSchema,
  battleType: battleTypeSchema,
  criteria: z.array(battleCriteriaSchema).optional(),
  scores: battleScoresSchema.optional(),
  aiAnalysis: z.any().optional(),
  eloChange: eloChangeSchema.optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export type ArenaBattle = z.infer<typeof arenaBattleSchema>;

// Tournament Status
export const tournamentStatusSchema = z.enum(['upcoming', 'active', 'completed', 'cancelled']);
export type TournamentStatus = z.infer<typeof tournamentStatusSchema>;

// Tournament Type
export const tournamentTypeSchema = z.enum(['single_elimination', 'double_elimination', 'round_robin']);
export type TournamentType = z.infer<typeof tournamentTypeSchema>;

// Tournament
export const tournamentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: tournamentStatusSchema,
  tournamentType: tournamentTypeSchema,
  maxParticipants: z.number().optional(),
  currentParticipants: z.number(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  prizePool: z.any().optional(),
  rules: z.any().optional(),
  brackets: z.any().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Tournament = z.infer<typeof tournamentSchema>;

// Achievement Rarity
export const achievementRaritySchema = z.enum(['common', 'rare', 'epic', 'legendary']);
export type AchievementRarity = z.infer<typeof achievementRaritySchema>;

// Achievement Category
export const achievementCategorySchema = z.enum(['battle', 'ranking', 'tournament', 'special']);
export type AchievementCategory = z.infer<typeof achievementCategorySchema>;

// Achievement
export const achievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  category: achievementCategorySchema,
  criteria: z.any(),
  rarity: achievementRaritySchema,
  points: z.number(),
  createdAt: z.date(),
});

export type Achievement = z.infer<typeof achievementSchema>;

// User Achievement
export const userAchievementSchema = z.object({
  id: z.string(),
  userId: z.string(),
  achievementId: z.string(),
  unlockedAt: z.date(),
});

export type UserAchievement = z.infer<typeof userAchievementSchema>;

// Battle Request
export const battleRequestSchema = z.object({
  opponentUsername: z.string().min(1, 'Opponent username is required'),
  battleType: battleTypeSchema.optional().default('standard'),
  criteria: z.array(battleCriteriaSchema).optional(),
});

export type BattleRequest = z.infer<typeof battleRequestSchema>;

// Battle Result
export const battleResultSchema = z.object({
  battle: z.object({
    scores: battleScoresSchema,
  }),
  analysis: z.object({
    winner: z.string(),
    reason: z.string(),
    highlights: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  repositories: z.object({
    challenger: z.object({
      total: z.number(),
      topRepos: z.array(z.string()),
    }),
    opponent: z.object({
      total: z.number(),
      topRepos: z.array(z.string()),
    }),
  }),
});

export type BattleResult = z.infer<typeof battleResultSchema>;

// Leaderboard Entry
export const leaderboardEntrySchema = z.object({
  rank: z.number(),
  username: z.string(),
  eloRating: z.number(),
  tier: z.string(),
  wins: z.number(),
  losses: z.number(),
  winRate: z.number(),
  totalBattles: z.number(),
  winStreak: z.number(),
});

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

// Tournament Bracket
export const tournamentBracketSchema = z.object({
  round: z.number(),
  matches: z.array(z.object({
    id: z.string(),
    player1: z.string().optional(),
    player2: z.string().optional(),
    winner: z.string().optional(),
    battleId: z.string().optional(),
  })),
});

export type TournamentBracket = z.infer<typeof tournamentBracketSchema>; 