/**
 * Rate limiting using Upstash Redis
 * Works across serverless function invocations
 *
 * Uses @upstash/ratelimit for sliding window rate limiting
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createLogger } from '@/lib/logging';

const logger = createLogger('RateLimit');

// Check if Upstash Redis is configured
// Redis.fromEnv() looks for UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN
const isRedisConfigured = !!(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
);

// Create Redis client using fromEnv() which auto-detects env var names
let redis: Redis | null = null;
if (isRedisConfigured) {
  try {
    redis = Redis.fromEnv();
  } catch (e) {
    logger.warn('Failed to initialize Redis from env:', { error: String(e) });
  }
}

/**
 * Rate limiter for AI-heavy operations (profile generation, battles, etc.)
 * Allows 5 requests per minute per user
 */
export const aiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:ai',
    })
  : null;

/**
 * Rate limiter for webhook endpoints
 * Allows 100 requests per minute per installation
 */
export const webhookRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:webhook',
    })
  : null;

/**
 * Rate limiter for API endpoints (general)
 * Allows 100 requests per minute per user
 */
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

/**
 * Rate limiter for unauthenticated requests (by IP)
 * Allows 10 requests per minute per IP
 */
export const ipRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:ip',
    })
  : null;

/**
 * Check rate limit for AI operations
 * Returns { success, limit, remaining, reset }
 */
export async function checkAIRateLimit(userId: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!aiRateLimiter) {
    logger.warn('AI rate limiter not configured (KV not available), allowing request');
    return { success: true, limit: 5, remaining: 5, reset: Date.now() + 60000 };
  }

  const result = await aiRateLimiter.limit(userId);

  if (!result.success) {
    logger.warn('AI rate limit exceeded', {
      userId,
      limit: result.limit,
      remaining: result.remaining,
    });
  }

  return result;
}

/**
 * Check rate limit for webhook endpoints
 */
export async function checkWebhookRateLimit(identifier: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!webhookRateLimiter) {
    logger.warn('Webhook rate limiter not configured (KV not available), allowing request');
    return { success: true, limit: 100, remaining: 100, reset: Date.now() + 60000 };
  }

  const result = await webhookRateLimiter.limit(identifier);

  if (!result.success) {
    logger.warn('Webhook rate limit exceeded', {
      identifier,
      limit: result.limit,
      remaining: result.remaining,
    });
  }

  return result;
}

/**
 * Check rate limit for general API endpoints
 */
export async function checkAPIRateLimit(userId: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!apiRateLimiter) {
    return { success: true, limit: 100, remaining: 100, reset: Date.now() + 60000 };
  }

  return apiRateLimiter.limit(userId);
}

/**
 * Check rate limit for unauthenticated requests
 */
export async function checkIPRateLimit(ip: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!ipRateLimiter) {
    return { success: true, limit: 10, remaining: 10, reset: Date.now() + 60000 };
  }

  return ipRateLimiter.limit(ip);
}

/**
 * Generation lock - prevents duplicate concurrent requests for the same resource
 * Uses Redis with TTL to auto-expire stale locks
 */
export async function acquireGenerationLock(
  key: string,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<boolean> {
  if (!redis) {
    logger.warn('Redis not configured, generation lock disabled');
    return true;
  }

  const lockKey = `lock:generation:${key}`;

  // Try to set the lock with NX (only if not exists)
  const acquired = await redis.set(lockKey, Date.now(), {
    nx: true, // Only set if not exists
    ex: ttlSeconds, // Expire after TTL
  });

  if (!acquired) {
    logger.info('Generation lock already held', { key });
    return false;
  }

  logger.debug('Generation lock acquired', { key, ttlSeconds });
  return true;
}

/**
 * Release a generation lock
 */
export async function releaseGenerationLock(key: string): Promise<void> {
  if (!redis) {
    return;
  }

  const lockKey = `lock:generation:${key}`;
  await redis.del(lockKey);
  logger.debug('Generation lock released', { key });
}

/**
 * Check if a generation is currently in progress
 */
export async function isGenerationInProgress(key: string): Promise<boolean> {
  if (!redis) {
    return false;
  }

  const lockKey = `lock:generation:${key}`;
  const value = await redis.get(lockKey);
  return value !== null;
}

/**
 * Cache stargazer status to reduce GitHub API calls
 * TTL: 1 hour
 */
export async function getCachedStargazerStatus(userId: string, repo: string): Promise<boolean | null> {
  if (!redis) {
    return null;
  }

  const cacheKey = `stargazer:${userId}:${repo}`;
  const cached = await redis.get<boolean>(cacheKey);
  return cached;
}

export async function setCachedStargazerStatus(userId: string, repo: string, hasStarred: boolean): Promise<void> {
  if (!redis) {
    return;
  }

  const cacheKey = `stargazer:${userId}:${repo}`;
  await redis.set(cacheKey, hasStarred, { ex: 3600 }); // 1 hour TTL
}
