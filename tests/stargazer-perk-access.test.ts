import { beforeEach, describe, expect, mock, test } from 'bun:test';

let leaseState: 'free' | 'busy' | 'used' = 'free';
let usageRows: Array<{ id: string }> = [];
const reservation = {
  leaseKey: 'test:lease', completionKey: 'test:completed', token: 'test-token', completionTtlSeconds: 100,
};
const reserve = mock(async () => {
  if (leaseState === 'used') return { status: 'used' as const };
  if (leaseState === 'busy') return { status: 'busy' as const };
  leaseState = 'busy';
  return { status: 'acquired' as const, reservation };
});
const finish = mock(async (_reservation: unknown, completed: boolean) => {
  leaseState = completed ? 'used' : 'free';
});
const dbLimit = mock(async (count: number) => usageRows.slice(0, count));
const dbSelect = mock(() => {
  const builder = {
    from: () => builder,
    where: () => builder,
    limit: dbLimit,
  };
  return builder;
});

mock.module('../src/db', () => ({ db: { select: dbSelect } }));
mock.module('../src/lib/rate-limit', () => ({
  getCachedStargazerStatus: async () => true,
  setCachedStargazerStatus: async () => {},
}));
mock.module('../src/lib/github', () => ({ createGitHubServiceForUserOperations: async () => ({}) }));
mock.module('../src/lib/utils/stargazer-reservation', () => ({
  reserveStargazerPerk: reserve,
  finishStargazerPerk: finish,
}));

const { checkStargazerPerk } = await import('../src/lib/utils/stargazer-perk');
const check = () => checkStargazerPerk('user-1', {} as never, 'profile', 'free');

beforeEach(() => {
  leaseState = 'free';
  usageRows = [];
  reserve.mockClear();
  finish.mockClear();
  dbLimit.mockClear();
  dbSelect.mockClear();
});

describe('stargazer free-use eligibility', () => {
  test('blocks concurrent targets, permits retry after failure, then blocks after success', async () => {
    const first = await check();
    expect(first.isStargazerPerk).toBe(true);
    expect(first.remainingFreeUses).toBe(1);
    expect(first.reservation).toEqual(reservation);

    const concurrent = await check();
    expect(concurrent.isStargazerPerk).toBe(false);
    expect(concurrent.errorMessage).toContain('already in progress');

    await finish(first.reservation, false); // failed generation: caller's finally releases the lease
    const retry = await check();
    expect(retry.isStargazerPerk).toBe(true);
    await finish(retry.reservation, true);
    usageRows = [{ id: 'flash' }, { id: 'pro' }];

    const used = await check();
    expect(used.isStargazerPerk).toBe(false);
    expect(used.remainingFreeUses).toBe(0);
    expect(used.errorMessage).toContain('larger monthly AI allowance');
    expect(used.errorMessage).not.toContain('unlimited');
  });

  test('multiple model token rows count as one completed free generation', async () => {
    usageRows = [{ id: 'flash' }, { id: 'pro' }];
    const used = await check();
    expect(used.isStargazerPerk).toBe(false);
    expect(used.remainingFreeUses).toBe(0);
    expect(dbLimit).toHaveBeenCalledWith(1);
    expect(finish).toHaveBeenCalledWith(reservation, false);
  });

  test('reservation service outage fails closed without a paid model call', async () => {
    reserve.mockImplementationOnce(async () => ({ status: 'unavailable' as const }));
    const result = await check();
    expect(result.isStargazerPerk).toBe(false);
    expect(result.errorMessage).toContain('temporarily unavailable');
    expect(dbSelect).not.toHaveBeenCalled();
  });
});
