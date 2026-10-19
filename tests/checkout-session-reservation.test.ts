import { describe, expect, test } from 'bun:test';
import {
  CheckoutGuardError,
  createCheckoutSessionOnce,
  type CheckoutReservationStore,
} from '../src/lib/stripe/checkout-guard-core';

function fakeStore() {
  const records = new Map<string, string>();
  const ttls: number[] = [];
  const store: CheckoutReservationStore = {
    async claim(key, value, ttl) {
      ttls.push(ttl);
      if (records.has(key)) return false;
      records.set(key, value);
      return true;
    },
    async read(key) { return records.get(key) ?? null; },
    async promote(key, expected, value, ttl) {
      ttls.push(ttl);
      if (records.get(key) !== expected) return false;
      records.set(key, value);
      return true;
    },
    async release(key, expected) {
      if (records.get(key) === expected) records.delete(key);
    },
  };
  return { store, records, ttls };
}

const now = 1_000_000;
const checkout = async ({ expiresAt, idempotencyKey }: { expiresAt: number; idempotencyKey: string }) => {
  expect(expiresAt - now).toBeGreaterThanOrEqual(30 * 60);
  expect(idempotencyKey).toMatch(/^checkout:[0-9a-f-]{36}$/);
  return { url: 'https://checkout.stripe.com/one', expires_at: expiresAt };
};

describe('Checkout Session reservation', () => {
  test('reuses one payable session for sequential requests from the same user', async () => {
    const { store, ttls } = fakeStore();
    let createCalls = 0;
    const create = async (args: Parameters<typeof checkout>[0]) => { createCalls++; return checkout(args); };

    const first = await createCheckoutSessionOnce(store, 'user-1', 'pro', create, now);
    const second = await createCheckoutSessionOnce(store, 'user-1', 'pro', create, now + 1);

    expect(first).toEqual({ url: 'https://checkout.stripe.com/one' });
    expect(second).toEqual(first);
    expect(createCalls).toBe(1);
    expect(ttls[0]).toBeGreaterThan(300); // creation claim outlives the serverless function
    expect(ttls[1]).toBeGreaterThan(30 * 60); // ready state outlives the Stripe session
  });

  test('parallel calls cannot create two sessions, including for different plans', async () => {
    const { store } = fakeStore();
    let resolveCreate!: (value: { url: string; expires_at: number }) => void;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    let createCalls = 0;
    const first = createCheckoutSessionOnce(store, 'user-1', 'pro', async () => {
      createCalls++;
      signalStarted();
      return new Promise((resolve) => { resolveCreate = resolve; });
    }, now);
    await started;

    await expect(createCheckoutSessionOnce(store, 'user-1', 'pro', checkout, now))
      .rejects.toMatchObject({ reason: 'in_progress' });
    await expect(createCheckoutSessionOnce(store, 'user-1', 'byok', checkout, now))
      .rejects.toMatchObject({ reason: 'plan_conflict' });
    resolveCreate({ url: 'https://checkout.stripe.com/one', expires_at: now + 2100 });
    await expect(first).resolves.toEqual({ url: 'https://checkout.stripe.com/one' });
    expect(createCalls).toBe(1);
  });

  test('a failed Stripe create releases only its claim so the user can retry', async () => {
    const { store, records } = fakeStore();
    await expect(createCheckoutSessionOnce(store, 'user-1', 'pro', async () => {
      throw new Error('Stripe unavailable');
    }, now)).rejects.toThrow('Stripe unavailable');
    expect(records.size).toBe(0);

    await expect(createCheckoutSessionOnce(store, 'user-1', 'pro', checkout, now))
      .resolves.toMatchObject({ url: 'https://checkout.stripe.com/one' });
  });

  test('missing or failing shared storage blocks Stripe creation', async () => {
    let createCalls = 0;
    const create = async (args: Parameters<typeof checkout>[0]) => { createCalls++; return checkout(args); };
    await expect(createCheckoutSessionOnce(null, 'user-1', 'pro', create, now))
      .rejects.toBeInstanceOf(CheckoutGuardError);
    const broken: CheckoutReservationStore = {
      claim: async () => { throw new Error('Redis down'); },
      read: async () => null,
      promote: async () => false,
      release: async () => {},
    };
    await expect(createCheckoutSessionOnce(broken, 'user-1', 'pro', create, now))
      .rejects.toMatchObject({ reason: 'unavailable' });
    expect(createCalls).toBe(0);
  });

  test('does not hand out a payable URL if reservation persistence fails', async () => {
    const { store } = fakeStore();
    store.promote = async () => { throw new Error('Redis down'); };
    await expect(createCheckoutSessionOnce(store, 'user-1', 'pro', checkout, now))
      .rejects.toMatchObject({ reason: 'unavailable' });
  });
});
