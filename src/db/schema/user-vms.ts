/**
 * User VMs - Personal development environments for github.gg users
 * Each user gets one VM tied to their account
 */

import { pgTable, uuid, varchar, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { devEnvironments } from './dev-environments';

export const userVms = pgTable('user_vms', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id).unique(), // One VM per user

  // Link to dev environment
  environmentId: uuid('environment_id').references(() => devEnvironments.id),

  // Status
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  // 'pending', 'provisioning', 'running', 'stopped', 'error', 'destroying'

  // Resources allocated
  vcpus: integer('vcpus').notNull().default(2),
  memoryMb: integer('memory_mb').notNull().default(4096),
  diskGb: integer('disk_gb').notNull().default(20),

  // Access details
  sshPort: integer('ssh_port'),
  sshPublicKey: text('ssh_public_key'), // User's SSH public key (stored as-is, it's public)
  sshUsername: varchar('ssh_username', { length: 50 }).default('vmuser'),
  internalIp: varchar('internal_ip', { length: 50 }),

  // Auto-stop configuration
  autoStop: boolean('auto_stop').notNull().default(true),
  autoStopMinutes: integer('auto_stop_minutes').default(60), // Stop after 1 hour idle

  // Usage tracking
  totalRuntimeMinutes: integer('total_runtime_minutes').notNull().default(0),
  lastStartedAt: timestamp('last_started_at'),
  lastStoppedAt: timestamp('last_stopped_at'),
  lastActivityAt: timestamp('last_activity_at'),

  // Metadata
  metadata: text('metadata'), // JSON string for additional data

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const userVmsRelations = relations(userVms, ({ one }) => ({
  user: one(user, {
    fields: [userVms.userId],
    references: [user.id],
  }),
  environment: one(devEnvironments, {
    fields: [userVms.environmentId],
    references: [devEnvironments.id],
  }),
}));

// Types
export type UserVm = typeof userVms.$inferSelect;
export type NewUserVm = typeof userVms.$inferInsert;
