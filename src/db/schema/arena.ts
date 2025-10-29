import { pgTable, text, timestamp, uuid, uniqueIndex, index, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Developer Rankings (ELO system)
export const developerRankings = pgTable('developer_rankings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }), // Nullable to support non-registered GitHub users
  username: text('username').notNull(),
  eloRating: integer('elo_rating').notNull().default(1200),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  totalBattles: integer('total_battles').notNull().default(0),
  winStreak: integer('win_streak').notNull().default(0),
  bestWinStreak: integer('best_win_streak').notNull().default(0),
  rank: integer('rank'), // Current global rank
  tier: text('tier').notNull().default('Bronze'), // Bronze, Silver, Gold, Platinum, Diamond, Master
  lastBattleAt: timestamp('last_battle_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique ranking per username (instead of userId to support non-registered users)
  usernameRankingIdx: uniqueIndex('username_ranking_idx').on(table.username),
  // Index for global rankings
  eloRatingIdx: index('elo_rating_idx').on(table.eloRating),
}));

// Arena Battles
export const arenaBattles = pgTable('arena_battles', {
  id: uuid('id').primaryKey().defaultRandom(),
  challengerId: text('challenger_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  opponentId: text('opponent_id').notNull(), // Remove foreign key constraint to allow dummy opponents
  challengerUsername: text('challenger_username').notNull(),
  opponentUsername: text('opponent_username').notNull(),
  winnerId: text('winner_id'), // Remove foreign key constraint to allow dummy winners
  status: text('status').notNull().default('pending'), // pending, in_progress, completed, cancelled
  battleType: text('battle_type').notNull().default('standard'), // standard, tournament, friendly
  criteria: jsonb('criteria').$type<string[]>(), // What criteria were judged
  scores: jsonb('scores').$type<{
    challenger: { total: number; breakdown: Record<string, number> };
    opponent: { total: number; breakdown: Record<string, number> };
  }>(),
  aiAnalysis: jsonb('ai_analysis'), // Detailed AI analysis of the battle
  eloChange: jsonb('elo_change').$type<{
    challenger: { before: number; after: number; change: number };
    opponent: { before: number; after: number; change: number };
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  // Index for battle history (non-unique to allow multiple battles between same users)
  battleHistoryIdx: index('battle_history_idx').on(table.challengerId, table.opponentId, table.createdAt),
}));

// Score History tracking for users
export const userScoreHistory = pgTable('user_score_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').notNull(),
  eloRating: integer('elo_rating'), // Nullable - only for arena battles
  overallScore: integer('overall_score'), // For profile scores
  source: text('source').notNull(), // 'arena_battle', 'profile_generation', 'scorecard'
  metadata: jsonb('metadata').$type<{
    battleId?: string;
    opponentUsername?: string;
    won?: boolean;
    ratingChange?: number;
    repoName?: string;
    [key: string]: unknown;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Index for time-series queries (non-unique to allow multiple entries at same timestamp)
  userHistoryIdx: index('user_history_idx').on(table.userId, table.createdAt),
  usernameHistoryIdx: index('username_history_idx').on(table.username, table.createdAt),
}));

// Tournaments
export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('upcoming'), // upcoming, active, completed, cancelled
  tournamentType: text('tournament_type').notNull().default('single_elimination'), // single_elimination, double_elimination, round_robin
  maxParticipants: integer('max_participants'),
  currentParticipants: integer('current_participants').notNull().default(0),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  prizePool: jsonb('prize_pool'), // Prize structure
  rules: jsonb('rules'), // Tournament rules and criteria
  brackets: jsonb('brackets'), // Tournament bracket structure
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tournament Participants
export const tournamentParticipants = pgTable('tournament_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').notNull(),
  seed: integer('seed'), // Tournament seeding
  finalRank: integer('final_rank'), // Final placement
  eliminated: boolean('eliminated').notNull().default(false),
  eliminatedAt: timestamp('eliminated_at'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique participation per tournament/user
  tournamentParticipantIdx: uniqueIndex('tournament_participant_idx').on(table.tournamentId, table.userId),
}));
