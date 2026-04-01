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

async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds });
  } else {
    memoryFallback.set(key, value);
    setTimeout(() => memoryFallback.delete(key), ttlSeconds * 1000);
  }
}

async function redisGet(key: string): Promise<string | null> {
  if (redis) {
    return await redis.get<string>(key);
  }
  return memoryFallback.get(key) || null;
}

async function redisDel(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
  } else {
    memoryFallback.delete(key);
  }
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
  await redisSet(`${JOB_PREFIX}${jobId}`, JSON.stringify(job), JOB_TTL);
  return jobId;
}

/**
 * Retrieve and consume a job (one-time use). Returns null if not found/expired/wrong user.
 */
export async function consumeJob(jobId: string, userId: string): Promise<AnalysisJob | null> {
  const key = `${JOB_PREFIX}${jobId}`;
  const raw = await redisGet(key);
  if (!raw) return null;

  const job: AnalysisJob = JSON.parse(raw);
  if (job.userId !== userId) return null;

  // Delete after consuming (one-time use)
  await redisDel(key);
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
  await redisSet(`${QUEUE_ITEM_PREFIX}${id}`, JSON.stringify(item), QUEUE_ITEM_TTL);

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

  const raw = await redisGet(`${QUEUE_ITEM_PREFIX}${id}`);
  if (!raw) return null;

  const item: QueueItem = JSON.parse(raw);
  item.status = 'processing';
  item.startedAt = Date.now();
  await redisSet(`${QUEUE_ITEM_PREFIX}${id}`, JSON.stringify(item), QUEUE_ITEM_TTL);

  return item;
}

/**
 * Update a queue item's status.
 */
export async function updateQueueItem(
  id: string,
  update: Partial<Pick<QueueItem, 'status' | 'error' | 'completedAt'>>,
): Promise<void> {
  const raw = await redisGet(`${QUEUE_ITEM_PREFIX}${id}`);
  if (!raw) return;

  const item: QueueItem = JSON.parse(raw);
  Object.assign(item, update);
  await redisSet(`${QUEUE_ITEM_PREFIX}${id}`, JSON.stringify(item), QUEUE_ITEM_TTL);
}

/**
 * Get the status of a queue item.
 */
export async function getQueueItem(id: string): Promise<QueueItem | null> {
  const raw = await redisGet(`${QUEUE_ITEM_PREFIX}${id}`);
  if (!raw) return null;
  return JSON.parse(raw);
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
    const raw = await redisGet(`${QUEUE_ITEM_PREFIX}${id}`);
    if (raw) {
      const item: QueueItem = JSON.parse(raw);
      if (item.userId === userId) items.push(item);
    }
  }

  return items;
}
