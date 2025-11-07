import { pgTable, text, timestamp, uuid, integer, jsonb, inet, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Firecracker Hosts - OVH servers running Firecracker
export const firecrackerHosts = pgTable('firecracker_hosts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // OVH instance details
  ovhInstanceId: text('ovh_instance_id').unique().notNull(),
  region: text('region').notNull(), // 'eu-west', 'us-east', etc.
  ipAddress: inet('ip_address').notNull(),

  // Capacity limits
  maxVms: integer('max_vms').notNull().default(50),
  maxVcpus: integer('max_vcpus').notNull().default(16),
  maxMemoryMb: integer('max_memory_mb').notNull().default(60000),

  // Current usage
  currentVms: integer('current_vms').notNull().default(0),
  currentVcpus: integer('current_vcpus').notNull().default(0),
  currentMemoryMb: integer('current_memory_mb').notNull().default(0),

  // Host status
  status: text('status').notNull().default('provisioning'), // 'provisioning', 'ready', 'full', 'maintenance', 'error'
  lastHealthCheck: timestamp('last_health_check'),
  healthCheckUrl: text('health_check_url'), // http://ip:port/health

  // Agent communication
  agentVersion: text('agent_version'),
  agentWsUrl: text('agent_ws_url'), // wss://ip:port for control plane

  // Metadata
  metadata: jsonb('metadata'), // additional config, features, etc.

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Dev Environments - individual VM instances
export const devEnvironments = pgTable('dev_environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),

  // Environment identification
  name: text('name'), // optional user-provided name
  slug: text('slug').unique().notNull(), // env_abc123 for URLs

  // Infrastructure
  hostId: uuid('host_id').references(() => firecrackerHosts.id).notNull(),
  vmId: text('vm_id').notNull(), // Firecracker VM identifier on the host

  // Network details
  ipAddress: inet('ip_address'),
  macAddress: text('mac_address'),
  sshPort: integer('ssh_port'),
  vscodePort: integer('vscode_port'),

  // Access
  wsEndpoint: text('ws_endpoint'), // wss://dev-abc123.github.gg
  sshPublicKey: text('ssh_public_key'),
  sshPrivateKey: text('ssh_private_key'), // encrypted
  accessToken: text('access_token'), // for auth

  // Resources
  vcpus: integer('vcpus').notNull().default(2),
  memoryMb: integer('memory_mb').notNull().default(4096),
  diskGb: integer('disk_gb').notNull().default(10),

  // State
  state: text('state').notNull().default('requested'),
  // 'requested', 'provisioning', 'starting', 'running', 'stopping', 'stopped', 'destroying', 'destroyed', 'error'
  stateMessage: text('state_message'), // Additional context about current state

  // Lifecycle
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  stoppedAt: timestamp('stopped_at'),
  expiresAt: timestamp('expires_at').notNull(), // auto-destroy after this
  lastActivityAt: timestamp('last_activity_at'),

  // Configuration
  baseImage: text('base_image').notNull().default('claude-dev-base-v1'),
  initScript: text('init_script'), // script to run on first boot
  environmentVars: jsonb('environment_vars'), // env vars to inject

  // GitHub integration
  repositoryUrl: text('repository_url'),
  repositoryCloned: boolean('repository_cloned').notNull().default(false),

  // Metadata
  metadata: jsonb('metadata'), // custom data, tags, etc.

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Environment Audit Log - track all environment operations
export const environmentAuditLog = pgTable('environment_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  environmentId: uuid('environment_id').references(() => devEnvironments.id, { onDelete: 'cascade' }),

  // Action tracking
  action: text('action').notNull(),
  // 'create', 'start', 'stop', 'destroy', 'execute', 'access', 'clone_repo', etc.
  status: text('status').notNull(), // 'success', 'failed', 'in_progress'

  // Details
  metadata: jsonb('metadata'), // action-specific data
  errorMessage: text('error_message'),

  // Execution time
  durationMs: integer('duration_ms'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Environment Execution - commands/scripts executed in environments
export const environmentExecutions = pgTable('environment_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  environmentId: uuid('environment_id').references(() => devEnvironments.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),

  // Command details
  command: text('command').notNull(),
  workingDir: text('working_dir').notNull().default('/workspace'),

  // Execution
  status: text('status').notNull().default('pending'), // 'pending', 'running', 'completed', 'failed', 'timeout'
  exitCode: integer('exit_code'),

  // Output (truncated/stored in object storage for large outputs)
  stdout: text('stdout'),
  stderr: text('stderr'),
  outputUrl: text('output_url'), // S3/R2 URL if output is large

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  timeoutAt: timestamp('timeout_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Base VM Images - snapshot catalog
export const vmImages = pgTable('vm_images', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: text('name').unique().notNull(), // 'claude-dev-base-v1', 'python-django-v1', etc.
  description: text('description'),

  // Image details
  imagePath: text('image_path').notNull(), // path on host storage
  sizeBytes: integer('size_bytes').notNull(),

  // Software installed
  software: jsonb('software'), // { node: '20.x', python: '3.11', ... }

  // Status
  isPublic: boolean('is_public').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),

  // Build info
  buildScript: text('build_script'), // how this image was created
  parentImageId: uuid('parent_image_id'), // if derived from another image

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Quotas - resource limits per user
export const userQuotas = pgTable('user_quotas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).unique().notNull(),

  // Environment limits
  maxEnvironments: integer('max_environments').notNull().default(1),
  maxConcurrentEnvironments: integer('max_concurrent_environments').notNull().default(1),
  maxEnvironmentDurationHours: integer('max_environment_duration_hours').notNull().default(24),

  // Resource limits
  maxVcpus: integer('max_vcpus').notNull().default(2),
  maxMemoryMb: integer('max_memory_mb').notNull().default(4096),
  maxDiskGb: integer('max_disk_gb').notNull().default(10),

  // Current usage
  currentEnvironments: integer('current_environments').notNull().default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
