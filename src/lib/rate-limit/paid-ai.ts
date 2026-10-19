import { createLogger } from '@/lib/logging';

const logger = createLogger('RateLimit');

type PaidAILimiter = {
  limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

export type PaidAIRateLimitResult =
  | { status: 'allowed'; limit: number; remaining: number; reset: number }
  | { status: 'limited'; limit: number; remaining: number; reset: number; retryAfterSeconds: number; message: string }
  | { status: 'unavailable'; limit: number; remaining: number; reset: number; message: string };

/** Shared per-user limit decision. Production fails closed. */
export async function applyPaidAIRateLimit(
  userId: string,
  limiter: PaidAILimiter | null,
  environment: string | undefined = process.env.NODE_ENV,
): Promise<PaidAIRateLimitResult> {
  const fallback = { limit: 5, remaining: 0, reset: Date.now() + 60_000 };
  const unavailable = (): PaidAIRateLimitResult => ({
    status: 'unavailable',
    ...fallback,
    message: 'AI request limits are temporarily unavailable. Please try again shortly.',
  });

  if (!userId) return unavailable();
  if (!limiter) {
    if (environment === 'production') {
      logger.error('Paid AI rate limiter is not configured');
      return unavailable();
    }
    return { status: 'allowed', limit: 5, remaining: 5, reset: fallback.reset };
  }

  try {
    const result = await limiter.limit(userId);
    if (result.success) return { status: 'allowed', ...result };

    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    logger.warn('Paid AI rate limit exceeded', { userId, retryAfterSeconds });
    return {
      status: 'limited',
      ...result,
      retryAfterSeconds,
      message: `Too many AI requests. Please try again in ${retryAfterSeconds} seconds.`,
    };
  } catch (error) {
    logger.error('Paid AI rate limiter failed', { error: String(error) });
    if (environment === 'production') return unavailable();
    return { status: 'allowed', limit: 5, remaining: 5, reset: fallback.reset };
  }
}
