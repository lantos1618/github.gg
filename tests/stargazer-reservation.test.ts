import { describe, expect, test } from 'bun:test';
import {
  finishStargazerPerkWithStore,
  reserveStargazerPerkWithStore,
} from '../src/lib/utils/stargazer-reservation-core';

function fakeStore() {
  const values = new Map<string, string>();
  return {
    values,
    async eval(script: string, keys: string[], args: string[]): Promise<number> {
      const [leaseKey, completionKey] = keys;
      if (script.includes("redis.call('EXISTS'")) {
        if (values.has(completionKey)) return 2;
        if (values.has(leaseKey)) return 0;
        values.set(leaseKey, args[0]);
        return 1;
      }
      if (values.get(leaseKey) !== args[0]) return 0;
      if (args[1] === '1') values.set(completionKey, '1');
      values.delete(leaseKey);
      return 1;
    },
  };
}

const october = new Date('2026-10-19T12:00:00Z');

describe('stargazer perk reservation lifecycle', () => {
  test('concurrent attempts share one lease; failure releases it for retry', async () => {
    const store = fakeStore();
    const [first, second] = await Promise.all([
      reserveStargazerPerkWithStore(store, 'user-1', 'profile', october),
      reserveStargazerPerkWithStore(store, 'user-1', 'profile', october),
    ]);
    expect(first.status).toBe('acquired');
    expect(second.status).toBe('busy');
    if (first.status !== 'acquired') throw new Error('Expected lease');
    expect(first.reservation.leaseKey).not.toContain('user-1');

    await finishStargazerPerkWithStore(store, first.reservation, false);
    const retry = await reserveStargazerPerkWithStore(store, 'user-1', 'profile', october);
    expect(retry.status).toBe('acquired');
  });

  test('success consumes only that feature in that UTC month', async () => {
    const store = fakeStore();
    const claimed = await reserveStargazerPerkWithStore(store, 'user-1', 'profile', october);
    if (claimed.status !== 'acquired') throw new Error('Expected lease');
    await finishStargazerPerkWithStore(store, claimed.reservation, true);

    expect((await reserveStargazerPerkWithStore(store, 'user-1', 'profile', october)).status).toBe('used');
    expect((await reserveStargazerPerkWithStore(store, 'user-1', 'wiki_generation', october)).status).toBe('acquired');
    expect((await reserveStargazerPerkWithStore(store, 'user-1', 'profile', new Date('2026-11-01T00:00:00Z'))).status).toBe('acquired');
  });

  test('a stale lease owner cannot release a later reservation', async () => {
    const store = fakeStore();
    const first = await reserveStargazerPerkWithStore(store, 'user-1', 'profile', october);
    if (first.status !== 'acquired') throw new Error('Expected lease');
    store.values.delete(first.reservation.leaseKey); // simulate lease expiry
    const second = await reserveStargazerPerkWithStore(store, 'user-1', 'profile', october);
    if (second.status !== 'acquired') throw new Error('Expected renewed lease');

    await finishStargazerPerkWithStore(store, first.reservation, false);
    expect((await reserveStargazerPerkWithStore(store, 'user-1', 'profile', october)).status).toBe('busy');
  });

  test('missing shared Redis disables the free reservation', async () => {
    expect((await reserveStargazerPerkWithStore(null, 'user-1', 'profile', october)).status).toBe('unavailable');
  });
});
