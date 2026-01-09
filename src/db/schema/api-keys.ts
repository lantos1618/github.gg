import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Public API keys for REST API access
export const publicApiKeys = pgTable('public_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // Friendly name for the key
  keyHash: text('key_hash').notNull().unique(), // SHA-256 hash of the API key
  keyPrefix: text('key_prefix').notNull(), // First 8 chars for identification (gg_xxxx...)
  scopes: text('scopes').array().notNull().default(['read']), // ['read', 'write', 'admin']
  rateLimit: integer('rate_limit').notNull().default(100), // Requests per minute
  isActive: boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'), // Optional expiration
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// API key usage tracking
export const apiKeyUsage = pgTable('api_key_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyId: uuid('key_id').references(() => publicApiKeys.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  statusCode: integer('status_code').notNull(),
  responseTimeMs: integer('response_time_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type PublicApiKey = typeof publicApiKeys.$inferSelect;
export type NewPublicApiKey = typeof publicApiKeys.$inferInsert;
