import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';

// User API Keys (for BYOK)
export const userApiKeys = pgTable('user_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }).notNull().unique(),
  encryptedGeminiApiKey: text('encrypted_gemini_api_key').notNull(),
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
