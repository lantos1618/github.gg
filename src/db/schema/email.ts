import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, inet } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Email Queue - stores all email jobs
export const emailQueue = pgTable('email_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),

  // Email details
  from: text('from').notNull(),
  to: text('to').notNull(),
  replyTo: text('reply_to'),
  subject: text('subject').notNull(),
  html: text('html').notNull(),

  // Template metadata (for logging/debugging)
  templateType: text('template_type'), // 'battle-results', 'profile-analysis', etc.
  templateData: jsonb('template_data'), // original data passed to template

  // Status tracking
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'sent', 'failed', 'retrying'
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  lastError: text('last_error'),

  // VM routing (null = use default SMTP, uuid = use user's VM)
  vmId: uuid('vm_id'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  scheduledFor: timestamp('scheduled_for').defaultNow().notNull(), // when to send
  processedAt: timestamp('processed_at'),
  sentAt: timestamp('sent_at'),
});

// Inbound Email Commands - emails sent to agent@github.gg
export const inboundEmailCommands = pgTable('inbound_email_commands', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),

  // Email metadata
  from: text('from').notNull(),
  to: text('to').notNull(), // agent@github.gg
  subject: text('subject').notNull(),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  messageId: text('message_id').unique(),
  inReplyTo: text('in_reply_to'),

  // Parsed command
  command: text('command'), // 'create', 'destroy', 'status', 'connect', 'execute'
  commandData: jsonb('command_data'), // parsed command parameters

  // Processing status
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),

  // Link to environment if command created one
  environmentId: uuid('environment_id'),

  // Response sent
  responseSent: boolean('response_sent').notNull().default(false),
  responseEmailId: uuid('response_email_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Account VMs - one VM per paying user
export const accountVms = pgTable('account_vms', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull().unique(),

  // VM infrastructure details
  vmId: text('vm_id').notNull().unique(), // Firecracker VM identifier
  ipAddress: text('ip_address'),
  macAddress: text('mac_address'),

  // VM configuration
  cpuCount: integer('cpu_count').notNull().default(1),
  memoryMb: integer('memory_mb').notNull().default(128),
  diskMb: integer('disk_mb').notNull().default(512),

  // Status
  status: text('status').notNull().default('provisioning'), // 'provisioning', 'running', 'stopped', 'error'
  lastHealthCheck: timestamp('last_health_check'),

  // OVH server location
  hostServer: text('host_server').notNull(), // which OVH server hosts this VM

  // Resource usage (for billing/monitoring)
  emailsSentToday: integer('emails_sent_today').notNull().default(0),
  emailsSentMonth: integer('emails_sent_month').notNull().default(0),
  lastResetDate: timestamp('last_reset_date').defaultNow(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  stoppedAt: timestamp('stopped_at'),
});

// Email Logs - delivery tracking
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  emailQueueId: uuid('email_queue_id').references(() => emailQueue.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  vmId: uuid('vm_id').references(() => accountVms.id, { onDelete: 'set null'}),

  // Delivery details
  status: text('status').notNull(), // 'delivered', 'bounced', 'complained', 'opened', 'clicked'
  smtpResponse: text('smtp_response'),
  smtpMessageId: text('smtp_message_id'),

  // Metadata
  metadata: jsonb('metadata'), // webhooks, tracking data, etc.

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// SMTP Configuration (per VM or global)
export const smtpConfigs = pgTable('smtp_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  vmId: uuid('vm_id').references(() => accountVms.id, { onDelete: 'cascade' }).unique(),

  // SMTP settings
  host: text('host').notNull(),
  port: integer('port').notNull().default(587),
  secure: boolean('secure').notNull().default(false), // true for 465, false for 587
  username: text('username').notNull(),
  encryptedPassword: text('encrypted_password').notNull(), // encrypt in app layer

  // Email settings
  fromDomain: text('from_domain').notNull(), // e.g., 'github.gg' or custom domain
  dkimPrivateKey: text('dkim_private_key'), // for email authentication

  // Rate limiting
  maxEmailsPerHour: integer('max_emails_per_hour').notNull().default(100),
  maxEmailsPerDay: integer('max_emails_per_day').notNull().default(1000),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
