import { pgTable, text, timestamp, uuid, boolean, uniqueIndex, integer, jsonb, varchar, serial } from 'drizzle-orm/pg-core';

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