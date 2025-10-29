import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Token Usage Tracking
export const tokenUsage = pgTable('token_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  feature: text('feature').notNull(), // 'diagram', 'scorecard', etc.
  repoOwner: text('repo_owner'), // GitHub username/org name
  repoName: text('repo_name'), // Repository name
  model: text('model'), // AI model used (e.g., gemini-2.5-pro)
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  isByok: boolean('is_byok').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
