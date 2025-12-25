import { pgTable, text, timestamp, uuid, uniqueIndex, index, integer, jsonb, varchar, boolean } from 'drizzle-orm/pg-core';
import type { ScorecardMetric, DiagramOptions } from '@/lib/types/scorecard';
import { user } from './auth';

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
  // Index for fast public repo queries (userId IS NULL ORDER BY stargazers_count DESC)
  publicReposStarsIdx: index('public_repos_stars_idx').on(table.userId, table.stargazersCount),
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

export const repositoryScorecards = pgTable('repository_scorecards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  ref: text('ref').default('main'),
  version: integer('version').notNull(), // Per-group version, set in app logic
  isPrivate: boolean('is_private').notNull().default(true),
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

export const aiSlopAnalyses = pgTable('ai_slop_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  ref: text('ref').default('main'),
  version: integer('version').notNull(), // Per-group version, set in app logic
  overallScore: integer('overall_score').notNull(), // 0-100 overall code quality score
  aiGeneratedPercentage: integer('ai_generated_percentage').notNull(), // 0-100 estimated AI-generated percentage
  detectedPatterns: jsonb('detected_patterns').$type<string[]>().notNull(), // List of AI slop patterns detected
  metrics: jsonb('metrics').$type<ScorecardMetric[]>().notNull(), // Structured metrics breakdown
  markdown: text('markdown').notNull(), // Full markdown analysis with recommendations
  fileHashes: jsonb('file_hashes').$type<Record<string, string>>(), // Hash of files to detect changes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique AI slop analysis per user, repo, ref, and version
  aiSlopUniqueIdx: uniqueIndex('ai_slop_unique_idx').on(
    table.userId,
    table.repoOwner,
    table.repoName,
    table.ref,
    table.version
  ),
}));

export const repoScoreHistory = pgTable('repo_score_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  ref: text('ref').default('main'),
  overallScore: integer('overall_score').notNull(),
  metrics: jsonb('metrics').$type<ScorecardMetric[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Index for time-series queries (non-unique to allow multiple entries at same timestamp)
  repoHistoryIdx: index('repo_history_idx').on(table.repoOwner, table.repoName, table.ref, table.createdAt),
}));

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
