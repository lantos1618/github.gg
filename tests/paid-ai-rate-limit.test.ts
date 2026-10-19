import { describe, expect, test } from 'bun:test';
import { applyPaidAIRateLimit } from '../src/lib/rate-limit/paid-ai';

describe('shared paid AI rate limit', () => {
  test('uses the same per-user key across paid features', async () => {
    const keys: string[] = [];
    const limiter = { limit: async (identifier: string) => {
      keys.push(identifier);
      return { success: true, limit: 5, remaining: 4, reset: Date.now() + 60_000 };
    } };

    expect((await applyPaidAIRateLimit('user-1', limiter, 'production')).status).toBe('allowed');
    expect((await applyPaidAIRateLimit('user-1', limiter, 'production')).status).toBe('allowed');
    expect(keys).toEqual(['user-1', 'user-1']);
  });

  test('reports a clear wait time when the shared limit is reached', async () => {
    const result = await applyPaidAIRateLimit('user-1', {
      limit: async () => ({ success: false, limit: 5, remaining: 0, reset: Date.now() + 30_000 }),
    }, 'production');

    expect(result).toMatchObject({ status: 'limited', limit: 5, remaining: 0 });
    if (result.status === 'limited') {
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(result.message).toContain('Please try again');
    }
  });

  test('fails closed in production when Redis is absent or throws', async () => {
    expect((await applyPaidAIRateLimit('user-1', null, 'production')).status).toBe('unavailable');
    expect((await applyPaidAIRateLimit('user-1', {
      limit: async () => { throw new Error('Redis unavailable'); },
    }, 'production')).status).toBe('unavailable');
    expect((await applyPaidAIRateLimit('', null, 'development')).status).toBe('unavailable');
  });

  test('keeps local development usable without Redis', async () => {
    expect((await applyPaidAIRateLimit('user-1', null, 'development')).status).toBe('allowed');
  });
});
