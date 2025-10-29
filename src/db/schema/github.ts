import { pgTable, text, timestamp, uuid, uniqueIndex, index, integer, jsonb, varchar, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';

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

// Webhook Preferences - per-installation PR review settings
export const webhookPreferences = pgTable('webhook_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  installationId: integer('installation_id').references(() => githubAppInstallations.installationId, { onDelete: 'cascade' }).notNull().unique(),
  prReviewEnabled: boolean('pr_review_enabled').notNull().default(true),
  autoUpdateEnabled: boolean('auto_update_enabled').notNull().default(true), // Update comment on PR sync
  minScoreThreshold: integer('min_score_threshold'), // Only comment if score below threshold
  excludedRepos: jsonb('excluded_repos').$type<string[]>().default([]), // List of repo full names to exclude
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// PR Analysis Cache
export const prAnalysisCache = pgTable('pr_analysis_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  prNumber: integer('pr_number').notNull(),
  version: integer('version').notNull(), // Per-PR version, increments on regeneration
  overallScore: integer('overall_score').notNull(), // 0-100 overall score
  analysis: jsonb('analysis').notNull(), // Structured analysis data
  markdown: text('markdown').notNull(), // Full markdown analysis
  prSnapshot: jsonb('pr_snapshot').$type<{
    title: string;
    baseBranch: string;
    headBranch: string;
    additions: number;
    deletions: number;
    changedFiles: number;
  }>(), // Snapshot of PR at time of analysis
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique analysis per user, repo, PR number, and version
  prAnalysisUniqueIdx: uniqueIndex('pr_analysis_unique_idx').on(
    table.userId,
    table.repoOwner,
    table.repoName,
    table.prNumber,
    table.version
  ),
}));

// Issue Analysis Cache
export const issueAnalysisCache = pgTable('issue_analysis_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  issueNumber: integer('issue_number').notNull(),
  version: integer('version').notNull(), // Per-issue version, increments on regeneration
  overallScore: integer('overall_score').notNull(), // 0-100 overall score
  slopRanking: integer('slop_ranking').notNull(), // 0-100 slop score
  suggestedPriority: text('suggested_priority').notNull(), // Priority level
  analysis: jsonb('analysis').notNull(), // Structured analysis data
  markdown: text('markdown').notNull(), // Full markdown analysis
  issueSnapshot: jsonb('issue_snapshot').$type<{
    title: string;
    state: string;
    comments: number;
    labels: string[];
  }>(), // Snapshot of issue at time of analysis
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique analysis per user, repo, issue number, and version
  issueAnalysisUniqueIdx: uniqueIndex('issue_analysis_unique_idx').on(
    table.userId,
    table.repoOwner,
    table.repoName,
    table.issueNumber,
    table.version
  ),
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
