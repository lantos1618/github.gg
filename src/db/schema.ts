import { pgTable, text, timestamp, uuid, boolean, uniqueIndex, integer, jsonb, varchar } from 'drizzle-orm/pg-core';
import type { ScorecardMetric, DiagramOptions } from '@/lib/types/scorecard';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('userId').references(() => user.id).notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').references(() => user.id).notNull(),
  providerId: text('providerId').notNull(),
  accountId: text('accountId').notNull(),
  scope: text('scope'),
  idToken: text('idToken'),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  installationId: integer('installation_id'),
}, (table) => ({
  // Ensure a user can only link a specific provider account once
  providerUserIdx: uniqueIndex('provider_user_idx').on(table.providerId, table.userId),
}));

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  userId: text('userId').references(() => user.id),
  identifier: text('identifier').notNull(),
  value: text('value'),
  token: text('token').unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export const cachedRepos = pgTable('cached_repos', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner: varchar('owner', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  stargazersCount: integer('stargazers_count').notNull().default(0),
  forksCount: integer('forks_count').notNull().default(0),
  language: text('language'),
  topics: jsonb('topics').$type<string[]>(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastFetched: timestamp('last_fetched').notNull().defaultNow(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
}, (table) => ({
  // This new index is the core of the fix.
  // It ensures a repo is unique per user, and allows one global entry where userId is null.
  repoIdentifierIdx: uniqueIndex('repo_identifier_idx').on(table.owner, table.name, table.userId),
}));

export const trendingRepos = pgTable('trending_repos', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  stargazersCount: integer('stargazers_count').notNull().default(0),
  forksCount: integer('forks_count').notNull().default(0),
  language: text('language'),
  topics: jsonb('topics').$type<string[]>(),
  starsToday: integer('stars_today').notNull().default(0),
  starsThisWeek: integer('stars_this_week').notNull().default(0),
  starsThisMonth: integer('stars_this_month').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastFetched: timestamp('last_fetched').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique trending repos
  trendingRepoIdx: uniqueIndex('trending_repo_idx').on(table.owner, table.name),
}));

export const insightsCache = pgTable('insights_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id).notNull(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  ref: text('ref').default('main'),
  insights: jsonb('insights').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique insights per user, repo, and ref
  insightsUniqueIdx: uniqueIndex('insights_unique_idx').on(
    table.userId,
    table.repoOwner,
    table.repoName,
    table.ref
  ),
}));

// GitHub App Installation Tables
export const githubAppInstallations = pgTable('github_app_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  installationId: integer('installation_id').notNull().unique(),
  accountId: integer('account_id').notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(), // 'User' or 'Organization'
  accountLogin: varchar('account_login', { length: 255 }).notNull(), // GitHub username/org name
  accountAvatarUrl: text('account_avatar_url'), // Avatar URL
  accountName: text('account_name'), // Display name
  repositorySelection: varchar('repository_selection', { length: 20 }).notNull(), // 'all' or 'selected'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const installationRepositories = pgTable('installation_repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  installationId: integer('installation_id').references(() => githubAppInstallations.installationId),
  repositoryId: integer('repository_id').notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  // Ensure unique repos per installation
  installationRepoIdx: uniqueIndex('installation_repo_idx').on(table.installationId, table.repositoryId),
})); 

// Monetization Tables

// User API Keys (for BYOK)
export const userApiKeys = pgTable('user_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull().unique(),
  encryptedGeminiApiKey: text('encrypted_gemini_api_key').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Token Usage Tracking
export const tokenUsage = pgTable('token_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  feature: text('feature').notNull(), // 'diagram', 'scorecard', etc.
  repoOwner: text('repo_owner'), // GitHub username/org name
  repoName: text('repo_name'), // Repository name
  model: text('model'), // AI model used (e.g., gemini-2.5-pro)
  promptTokens: integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  isByok: boolean('is_byok').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Featured Repositories (Advertisers)
export const featuredRepos = pgTable('featured_repos', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryUrl: text('repository_url').notNull(),
  repositoryName: text('repository_name').notNull(),
  sponsorName: text('sponsor_name').notNull(),
  bidAmount: integer('bid_amount').notNull(), // in cents
  position: integer('position').notNull(), // 1-10 ranking
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// User Subscriptions (Stripe)
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull(),
  plan: text('plan').notNull(), // 'byok', 'pro'
  status: text('status').notNull(), // 'active', 'canceled', 'past_due'
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Developer Profile Cache
export const developerProfileCache = pgTable('developer_profile_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  version: integer('version').notNull().default(1),
  profileData: jsonb('profile_data').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique profile per username and version
  usernameIdx: uniqueIndex('username_idx').on(table.username, table.version),
}));

// Repository Scorecards - structured analysis data
export const repositoryScorecards = pgTable('repository_scorecards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  ref: text('ref').default('main'),
  version: integer('version').notNull(), // Per-group version, set in app logic
  overallScore: integer('overall_score').notNull(), // 0-100 overall score
  metrics: jsonb('metrics').$type<ScorecardMetric[]>().notNull(), // Structured metrics breakdown
  markdown: text('markdown').notNull(), // Full markdown analysis
  fileHashes: jsonb('file_hashes').$type<Record<string, string>>(), // Hash of files to detect changes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique scorecard per user, repo, ref, and version
  scorecardUniqueIdx: uniqueIndex('scorecard_unique_idx').on(
    table.userId,
    table.repoOwner,
    table.repoName,
    table.ref,
    table.version
  ),
}));

// Repository Diagrams - structured diagram data
export const repositoryDiagrams = pgTable('repository_diagrams', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  ref: text('ref').default('main'),
  diagramType: text('diagram_type').notNull(), // 'file_tree', 'dependency', 'timeline', 'heatmap'
  version: integer('version').notNull().default(1),
  diagramCode: text('diagram_code').notNull(), // Mermaid diagram code
  format: text('format').notNull().default('mermaid'), // Diagram format
  options: jsonb('options').$type<DiagramOptions>(), // Diagram generation options
  fileHashes: jsonb('file_hashes').$type<Record<string, string>>(), // Hash of files to detect changes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique diagram per user, repo, ref, type, and version
  diagramUniqueIdx: uniqueIndex('diagram_unique_idx').on(
    table.userId,
    table.repoOwner,
    table.repoName,
    table.ref,
    table.diagramType,
    table.version
  ),
}));

// 🏟️ DEV ARENA TABLES

// Developer Rankings (ELO system)
export const developerRankings = pgTable('developer_rankings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
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
  // Ensure unique ranking per user
  userRankingIdx: uniqueIndex('user_ranking_idx').on(table.userId),
  // Index for global rankings
  eloRatingIdx: uniqueIndex('elo_rating_idx').on(table.eloRating),
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
  // Index for battle history
  battleHistoryIdx: uniqueIndex('battle_history_idx').on(table.challengerId, table.opponentId, table.createdAt),
}));

// Score History tracking for users
export const userScoreHistory = pgTable('user_score_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').notNull(),
  eloRating: integer('elo_rating').notNull(),
  overallScore: integer('overall_score'), // For profile scores
  source: text('source').notNull(), // 'arena_battle', 'profile_generation', 'scorecard'
  metadata: jsonb('metadata').$type<{
    battleId?: string;
    opponentUsername?: string;
    repoName?: string;
    [key: string]: unknown;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Index for time-series queries
  userHistoryIdx: uniqueIndex('user_history_idx').on(table.userId, table.createdAt),
  usernameHistoryIdx: uniqueIndex('username_history_idx').on(table.username, table.createdAt),
}));

// Repository Score History
export const repoScoreHistory = pgTable('repo_score_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  ref: text('ref').default('main'),
  overallScore: integer('overall_score').notNull(),
  metrics: jsonb('metrics').$type<ScorecardMetric[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Index for time-series queries
  repoHistoryIdx: uniqueIndex('repo_history_idx').on(table.repoOwner, table.repoName, table.ref, table.createdAt),
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

// Achievements
export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon'), // Emoji or icon name
  category: text('category').notNull(), // battle, ranking, tournament, special
  criteria: jsonb('criteria').notNull(), // Achievement criteria
  rarity: text('rarity').notNull().default('common'), // common, rare, epic, legendary
  points: integer('points').notNull().default(0), // Achievement points
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User Achievements
export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  achievementId: uuid('achievement_id').references(() => achievements.id, { onDelete: 'cascade' }).notNull(),
  unlockedAt: timestamp('unlocked_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique achievement per user
  userAchievementIdx: uniqueIndex('user_achievement_idx').on(table.userId, table.achievementId),
}));

// Developer Emails - for marketing and notifications
export const developerEmails = pgTable('developer_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  firstFoundAt: timestamp('first_found_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
  sourceRepo: text('source_repo'),
});

// Do NOT import or export relations here. Only table definitions. 