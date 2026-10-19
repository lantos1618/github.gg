/**
 * BullMQ-backed queue for GitHub webhook events.
 *
 * Why: GitHub webhook deliveries arrive on Vercel serverless functions with a
 * hard 30s cap. The `installation.created` and `installation_repositories.added`
 * handlers do multi-row Neon HTTP inserts that can exceed that window for
 * users with many repos, and GitHub does NOT retry installation events — so a
 * single timeout silently loses the install.
 *
 * Fix: the request path verifies the signature, dedups by delivery ID, and
 * enqueues a job. A long-lived worker (Vercel Daemon — see
 * WORKER_DEPLOYMENT.md) drains the queue and performs the heavy DB writes
 * with proper retries.
 *
 * Redis connection: BullMQ requires a real TCP connection via `ioredis` — it
 * cannot use the Upstash REST client that powers our rate-limit/dedup paths.
 * Vercel KV exposes `REDIS_URL` for exactly this case, so we use that. If it's
 * not set the factory returns null and the webhook receiver returns 500, so
 * GitHub can retry the delivery.
 */

import { Queue, type QueueOptions } from 'bullmq';
import IORedis, { type Redis as IORedisClient } from 'ioredis';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WebhookQueue');

// ─── Connection ──────────────────────────────────────────────────────

let sharedConnection: IORedisClient | null = null;
let connectionAttempted = false;

/**
 * Lazily build a singleton ioredis client from `REDIS_URL`.
 *
 * BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`
 * for blocking commands used by workers; we set those at the connection level
 * so the same client can be reused by both producer (Queue) and consumer
 * (Worker) contexts.
 */
function getConnection(): IORedisClient | null {
  if (sharedConnection) return sharedConnection;
  if (connectionAttempted) return null;
  connectionAttempted = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn(
      'REDIS_URL not set — webhook queue disabled; receiver cannot enqueue events.',
    );
    return null;
  }

  try {
    sharedConnection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    sharedConnection.on('error', (err) => {
      logger.error('Redis connection error', err);
    });
    return sharedConnection;
  } catch (err) {
    logger.error('Failed to build ioredis client from REDIS_URL', err);
    return null;
  }
}

// ─── Queue factory ───────────────────────────────────────────────────

const queues = new Map<string, Queue>();

export const WEBHOOK_QUEUE_NAME = 'github-webhooks';

/**
 * Default job options for the webhook queue.
 *
 * 3 retries with exponential backoff (1s, 2s, 4s) — generous enough to absorb
 * transient Neon HTTP blips without burning the queue on hard failures.
 * Retained completed/failed history is short so the queue doesn't bloat.
 */
export const DEFAULT_WEBHOOK_JOB_OPTS: QueueOptions['defaultJobOptions'] = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 60 * 60, count: 1000 },
  removeOnFail: { age: 24 * 60 * 60, count: 1000 },
};

/**
 * Get or create a named BullMQ queue.
 *
 * Returns null if Redis isn't configured. The webhook receiver must return an
 * error rather than acknowledge an event that it could not enqueue.
 */
export function getQueue(name: string = WEBHOOK_QUEUE_NAME): Queue | null {
  const cached = queues.get(name);
  if (cached) return cached;

  const connection = getConnection();
  if (!connection) return null;

  const queue = new Queue(name, {
    connection,
    defaultJobOptions: DEFAULT_WEBHOOK_JOB_OPTS,
  });
  queue.on('error', (err) => {
    logger.error('Queue error', err, { name });
  });
  queues.set(name, queue);
  return queue;
}

// ─── Enqueue API ─────────────────────────────────────────────────────

export interface WebhookJobData {
  deliveryId: string;
  eventName: string;
  /**
   * Raw GitHub payload parsed as JSON. We keep it as `unknown` here because the
   * shape depends on `eventName` and is narrowed in the per-event handlers.
   */
  payload: unknown;
}

/**
 * Enqueue a verified webhook event for background processing.
 *
 * The job ID is the GitHub delivery ID, which gives us a second layer of
 * idempotency on top of the Redis SETNX dedup in the request path: even if
 * the dedup mark gets evicted, BullMQ's "duplicate job ID" semantics prevent
 * the same delivery from being processed twice.
 *
 * Returns true if the job was successfully enqueued, false otherwise.
 */
export async function enqueueWebhookEvent(
  deliveryId: string,
  eventName: string,
  payload: unknown,
): Promise<boolean> {
  const queue = getQueue();
  if (!queue) {
    logger.warn('Webhook queue unavailable — dropping event', {
      deliveryId,
      eventName,
    });
    return false;
  }

  try {
    await queue.add(
      eventName,
      { deliveryId, eventName, payload } satisfies WebhookJobData,
      { jobId: deliveryId },
    );
    return true;
  } catch (err) {
    logger.error('Failed to enqueue webhook event', err, {
      deliveryId,
      eventName,
    });
    return false;
  }
}

/**
 * Expose the connection for the worker entry point. Worker and Queue MUST
 * share the same ioredis instance config to avoid pool fragmentation.
 */
export function getWebhookRedisConnection(): IORedisClient | null {
  return getConnection();
}
