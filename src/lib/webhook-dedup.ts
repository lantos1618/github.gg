/**
 * Webhook delivery-ID deduplication (audit R3).
 *
 * GitHub retries webhooks on non-2xx responses — sometimes within seconds, and
 * sometimes the same delivery ID arrives more than once even on success
 * (network blips, edge retries). Without dedup, every retry triggers another
 * round of AI analysis and token spend.
 *
 * Uses Upstash Redis (same client as rate-limit/index.ts). If Redis is
 * unavailable we fall back to allowing the webhook through — dropping legit
 * events would be a worse failure mode than occasional double-processing.
 */
import { Redis } from '@upstash/redis';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WebhookDedup');

const isRedisConfigured = !!(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
);

let redis: Redis | null = null;
if (isRedisConfigured) {
  try {
    redis = Redis.fromEnv();
  } catch (e) {
    logger.warn('Failed to initialize Redis from env', { error: String(e) });
  }
}

const KEY_PREFIX = 'webhook:delivery:';
const DEFAULT_TTL_SECONDS = 3600; // 1 hour — well beyond GitHub's retry window

function buildKey(deliveryId: string): string {
  return `${KEY_PREFIX}${deliveryId}`;
}

/**
 * Atomically mark a delivery ID as processed.
 *
 * Returns true if this caller acquired the dedup slot (i.e. this is the first
 * time we've seen the delivery ID and the caller should proceed to process
 * the webhook). Returns false if another caller already claimed it.
 *
 * Uses Redis SET ... NX EX so the mark + check is a single round trip and
 * cannot race against concurrent callers.
 *
 * If Redis is unavailable, returns true (fail-open — better to process a
 * duplicate than to drop a legit webhook).
 */
export async function markWebhookProcessed(
  deliveryId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<boolean> {
  if (!redis) {
    logger.warn('Redis not configured, skipping webhook dedup', { deliveryId });
    return true;
  }

  try {
    const result = await redis.set(buildKey(deliveryId), '1', {
      nx: true,
      ex: ttlSeconds,
    });
    // Upstash returns 'OK' on a successful NX set, null when the key already
    // existed.
    return result === 'OK';
  } catch (err) {
    logger.warn('Redis dedup mark failed, processing anyway', {
      deliveryId,
      error: err instanceof Error ? err.message : String(err),
    });
    return true;
  }
}

/**
 * Read-only check for whether a delivery ID has been processed. Generally not
 * needed at the request hot path — prefer markWebhookProcessed which combines
 * check + mark atomically — but useful for observability / tests.
 */
export async function wasWebhookProcessed(deliveryId: string): Promise<boolean> {
  if (!redis) return false;
  try {
    const value = await redis.get<string>(buildKey(deliveryId));
    return value !== null;
  } catch (err) {
    logger.warn('Redis dedup check failed', {
      deliveryId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
