import { z } from 'zod';

// ELO Rating System
export const eloRatingSchema = z.object({
  rating: z.number().min(0),
  wins: z.number().min(0),
  losses: z.number().min(0),
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
    breakdown: z.record(z.string(), z.number()),
  }),
  opponent: z.object({
    total: z.number(),
    breakdown: z.record(z.string(), z.number()),
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
export const battleStatusSchema = z.enum(['pending', 'completed', 'cancelled']);

// AI Analysis
export const aiAnalysisSchema = z.object({
  winner: z.string(),
  reason: z.string(),
  highlights: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  repositories: z.object({
    challenger: z.object({
      total: z.number(),
      topRepos: z.array(z.string()).optional(),
    }),
    opponent: z.object({
      total: z.number(),
      topRepos: z.array(z.string()).optional(),
    }),
  }).optional(),
});

export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;

// Arena Battle
export const arenaBattleSchema = z.object({
  id: z.string(),
  challengerId: z.string(),
  opponentId: z.string(),
  challengerUsername: z.string(),
  opponentUsername: z.string(),
  winnerId: z.string().optional(),
  status: battleStatusSchema,
  criteria: z.array(battleCriteriaSchema).optional(),
  scores: battleScoresSchema.optional(),
  aiAnalysis: aiAnalysisSchema.optional(),
  eloChange: eloChangeSchema.optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export type ArenaBattle = z.infer<typeof arenaBattleSchema>;

// Battle Request
export const battleRequestSchema = z.object({
  opponentUsername: z.string().min(1, 'Opponent username is required'),
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