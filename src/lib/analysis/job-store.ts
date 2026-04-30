/**
 * Redis-backed job store for analysis tasks.
 *
 * Solves: in-memory Map doesn't survive serverless cold starts on Vercel.
 * Jobs are created via POST mutation, consumed by SSE subscription.
 * Also provides a queue for batch processing with concurrency control.
 *
 * Uses Upstash Redis (already configured for rate limiting).
 */

import crypto from 'crypto';
import { Redis } from '@upstash/redis';

// ─── Types ──────────────────────────────────────────────────────────

export interface AnalysisJob {
  user: string;
  repo: string;
  ref?: string;
  filePaths: string[];
  userId: string;
  createdAt: number;
}

export interface QueueItem {
  id: string;
  type: 'profile' | 'scorecard' | 'wiki' | 'diagram' | 'ai-slop';
  params: Record<string, unknown>;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

// ─── Redis client ───────────────────────────────────────────────────

const isRedisConfigured = !!(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
);

let redis: Redis | null = null;
if (isRedisConfigured) {
  try {
    redis = Redis.fromEnv();
  } catch {
    console.warn('[job-store] Failed to initialize Redis');
  }
}

// In-memory fallback for local dev (not production-safe)
const memoryFallback = new Map<string, string>();

// Store an object. We always JSON.stringify going in. Upstash will store the
// string as-is; on read it auto-deserializes JSON-looking strings, so the
// reader gets back the parsed object. We normalize that in redisGetJson.
async function redisSetJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const str = JSON.stringify(value);
  if (redis) {
    await redis.set(key, str, { ex: ttlSeconds });
  } else {
    memoryFallback.set(key, str);
    setTimeout(() => memoryFallback.delete(key), ttlSeconds * 1000);
  }
}

// Returns the stored object or null. Handles both Upstash auto-parsed
// objects and the local memoryFallback (which stores raw strings).
async function redisGetJson<T>(key: string): Promise<T | null> {
  if (redis) {
    const v = await redis.get<unknown>(key);
    if (v === null || v === undefined) return null;
    return (typeof v === 'string' ? JSON.parse(v) : v) as T;
  }
  const raw = memoryFallback.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

// ─── Job Store (for POST+SSE two-step analysis) ────────────────────

const JOB_TTL = 300; // 5 minutes
const JOB_PREFIX = 'analysis:job:';

/**
 * Create a job and store params in Redis. Returns a short jobId.
 */
export async function createJob(params: Omit<AnalysisJob, 'createdAt'>): Promise<string> {
  const jobId = crypto.randomBytes(16).toString('hex');
  const job: AnalysisJob = { ...params, createdAt: Date.now() };
  await redisSetJson(`${JOB_PREFIX}${jobId}`, job, JOB_TTL);
  return jobId;
}

/**
 * Retrieve a job. Returns null if not found / expired / wrong user.
 *
 * Idempotent within the TTL: the job is NOT deleted on read. If the SSE
 * subscription drops and the client auto-reconnects, the new server
 * generator can re-fetch the same job and continue, instead of yielding
 * "Analysis job not found" on every reconnect. Redis TTL (5min) cleans up.
 */
export async function consumeJob(jobId: string, userId: string): Promise<AnalysisJob | null> {
  const key = `${JOB_PREFIX}${jobId}`;
  const job = await redisGetJson<AnalysisJob>(key);
  if (!job) return null;
  if (job.userId !== userId) return null;
  return job;
}

// ─── Queue (for batch processing) ──────────────────────────────────

const QUEUE_PREFIX = 'queue:';
const QUEUE_ITEM_PREFIX = 'queue:item:';
const QUEUE_ITEM_TTL = 3600; // 1 hour

/**
 * Add an item to the processing queue.
 */
export async function enqueue(
  type: QueueItem['type'],
  params: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const id = crypto.randomBytes(12).toString('hex');
  const item: QueueItem = {
    id,
    type,
    params,
    userId,
    status: 'pending',
    createdAt: Date.now(),
  };

  // Store the item data
  await redisSetJson(`${QUEUE_ITEM_PREFIX}${id}`, item, QUEUE_ITEM_TTL);

  // Push to the queue list (FIFO: push left, pop right)
  if (redis) {
    await redis.lpush(`${QUEUE_PREFIX}${type}`, id);
  }

  return id;
}

/**
 * Dequeue the next pending item for processing.
 * Returns null if queue is empty.
 */
export async function dequeue(type: QueueItem['type']): Promise<QueueItem | null> {
  if (!redis) return null;

  const id = await redis.rpop<string>(`${QUEUE_PREFIX}${type}`);
  if (!id) return null;

  const item = await redisGetJson<QueueItem>(`${QUEUE_ITEM_PREFIX}${id}`);
  if (!item) return null;

  item.status = 'processing';
  item.startedAt = Date.now();
  await redisSetJson(`${QUEUE_ITEM_PREFIX}${id}`, item, QUEUE_ITEM_TTL);

  return item;
}

/**
 * Update a queue item's status.
 */
export async function updateQueueItem(
  id: string,
  update: Partial<Pick<QueueItem, 'status' | 'error' | 'completedAt'>>,
): Promise<void> {
  const item = await redisGetJson<QueueItem>(`${QUEUE_ITEM_PREFIX}${id}`);
  if (!item) return;

  Object.assign(item, update);
  await redisSetJson(`${QUEUE_ITEM_PREFIX}${id}`, item, QUEUE_ITEM_TTL);
}

/**
 * Get the status of a queue item.
 */
export async function getQueueItem(id: string): Promise<QueueItem | null> {
  return await redisGetJson<QueueItem>(`${QUEUE_ITEM_PREFIX}${id}`);
}

/**
 * Get the length of a queue.
 */
export async function getQueueLength(type: QueueItem['type']): Promise<number> {
  if (!redis) return 0;
  return await redis.llen(`${QUEUE_PREFIX}${type}`);
}

/**
 * Get all pending items for a user in a queue.
 */
export async function getUserQueueItems(
  type: QueueItem['type'],
  userId: string,
): Promise<QueueItem[]> {
  if (!redis) return [];

  // Get all IDs in the queue
  const ids = await redis.lrange<string>(`${QUEUE_PREFIX}${type}`, 0, -1);
  if (!ids || ids.length === 0) return [];

  // Fetch items and filter by userId
  const items: QueueItem[] = [];
  for (const id of ids) {
    const item = await redisGetJson<QueueItem>(`${QUEUE_ITEM_PREFIX}${id}`);
    if (item && item.userId === userId) {
      items.push(item);
    }
  }

  return items;
}
