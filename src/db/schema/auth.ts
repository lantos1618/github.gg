import { pgTable, text, timestamp, boolean, uniqueIndex, integer, json } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false),
  image: text('image'),
  githubUsername: text('github_username'),
  vmTier: text('vm_tier').default('free'), // 'free', 'pro', 'unlimited'
  role: text('role').default('user'), // 'user', 'admin'
  profileStyles: json('profile_styles').$type<{
    theme?: 'light' | 'dark' | 'system' | 'custom';
    primaryColor?: string;
    backgroundColor?: string;
    accentColor?: string;
    textColor?: string;
    sparkles?: boolean;
    emoji?: string;
    backgroundPattern?: 'none' | 'dots' | 'grid';
  }>(),
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
