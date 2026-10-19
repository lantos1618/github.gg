import { describe, expect, test } from 'bun:test';
import {
  checkMonthlyTokenQuota,
  PRO_MONTHLY_MANAGED_TOKEN_LIMIT,
  type ManagedTokenUsageReader,
} from '../src/lib/ai/monthly-quota';

describe('Pro monthly managed-AI quota', () => {
  test('BYOK remains unlimited without reading managed usage', async () => {
    const reader: ManagedTokenUsageReader = async () => {
      throw new Error('BYOK must not query managed usage');
    };

    expect(await checkMonthlyTokenQuota({ userId: 'user-1', isByok: true }, reader))
      .toEqual({ allowed: true, status: 'unlimited' });
  });

  test('queries the UTC calendar month and allows usage below 5M', async () => {
    let observed: Parameters<ManagedTokenUsageReader>[0] | undefined;
    const reader: ManagedTokenUsageReader = async query => {
      observed = query;
      return PRO_MONTHLY_MANAGED_TOKEN_LIMIT - 1;
    };

    // This instant is November 1 UTC, despite its October local date.
    const result = await checkMonthlyTokenQuota({
      userId: 'user-1',
      isByok: false,
      at: new Date('2026-10-31T23:30:00-02:00'),
    }, reader);

    expect(observed).toEqual({
      userId: 'user-1',
      periodStart: new Date('2026-11-01T00:00:00.000Z'),
      periodEnd: new Date('2026-12-01T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      allowed: true,
      status: 'available',
      limitTokens: 5_000_000,
      usedTokens: 4_999_999,
      remainingTokens: 1,
    });
  });

  test('denies exactly at the limit with a stable error code and reset date', async () => {
    const result = await checkMonthlyTokenQuota({
      userId: 'user-1',
      isByok: false,
      at: new Date('2026-12-31T23:59:59Z'),
    }, async () => 5_000_000);

    expect(result).toMatchObject({
      allowed: false,
      status: 'exhausted',
      code: 'MONTHLY_MANAGED_TOKEN_LIMIT_REACHED',
      usedTokens: 5_000_000,
      remainingTokens: 0,
      periodEnd: new Date('2027-01-01T00:00:00Z'),
    });
    if (result.status === 'exhausted') {
      expect(result.message).toContain('2027-01-01 UTC');
    }
  });

  test('denies recorded usage above the limit', async () => {
    const result = await checkMonthlyTokenQuota(
      { userId: 'user-1', isByok: false },
      async () => 6_000_000,
    );
    expect(result.allowed).toBe(false);
    expect(result.status).toBe('exhausted');
  });

  test('propagates database failure and rejects invalid totals instead of granting usage', async () => {
    const input = { userId: 'user-1', isByok: false };
    await expect(checkMonthlyTokenQuota(input, async () => {
      throw new Error('database unavailable');
    })).rejects.toThrow('database unavailable');

    await expect(checkMonthlyTokenQuota(input, async () => Number.NaN))
      .rejects.toThrow('Invalid managed token usage total');
    await expect(checkMonthlyTokenQuota(input, async () => -1))
      .rejects.toThrow('Invalid managed token usage total');
  });
});
