import { createHash } from 'node:crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createLogger } from '@/lib/logging';

const logger = createLogger('FeatureRequestRateLimit');

type RateLimitResult =
  | { status: 'allowed' }
  | { status: 'limited'; retryAfterSeconds: number }
  | { status: 'unavailable' };

type Limiter = {
  limit(identifier: string): Promise<{ success: boolean; reset: number }>;
};

const hasRedisConfig = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
);

let redis: Redis | null = null;
if (hasRedisConfig) {
  try {
    redis = Redis.fromEnv();
  } catch (error) {
    logger.error('Failed to initialize feature request rate limiter', {
      error: String(error),
    });
  }
}

// Both limits live in Redis, so they apply across serverless instances. The
// global quota also bounds abuse when an attacker rotates submitted addresses.
const globalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 h'),
      prefix: 'ratelimit:feature-request:global',
    })
  : null;

const emailLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 d'),
      prefix: 'ratelimit:feature-request:email',
    })
  : null;

function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

export async function applyFeatureRequestRateLimits(
  email: string,
  limiters: { email: Limiter | null; global: Limiter | null }
): Promise<RateLimitResult> {
  // This endpoint sends email, so missing or failing Redis must never turn the
  // limiter into an in-memory or fail-open check in production.
  if (!limiters.email || !limiters.global) {
    return { status: 'unavailable' };
  }

  try {
    // Hash the normalized address so Redis keys do not expose submitted email.
    const emailKey = createHash('sha256').update(email.toLowerCase()).digest('hex');
    const emailResult = await limiters.email.limit(emailKey);
    if (!emailResult.success) {
      return { status: 'limited', retryAfterSeconds: retryAfterSeconds(emailResult.reset) };
    }

    const globalResult = await limiters.global.limit('all');
    if (!globalResult.success) {
      return { status: 'limited', retryAfterSeconds: retryAfterSeconds(globalResult.reset) };
    }

    return { status: 'allowed' };
  } catch (error) {
    logger.error('Feature request rate limiter unavailable', { error: String(error) });
    return { status: 'unavailable' };
  }
}

export async function checkFeatureRequestRateLimit(email: string): Promise<RateLimitResult> {
  return applyFeatureRequestRateLimits(email, { email: emailLimiter, global: globalLimiter });
}
