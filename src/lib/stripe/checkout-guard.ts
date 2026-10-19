import { Redis } from '@upstash/redis';
import {
  CheckoutGuardError,
  createCheckoutSessionOnce,
  type CheckoutPlan,
  type CheckoutReservationStore,
} from './checkout-guard-core';

const PROMOTE_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
  end
  return nil
`;
const RELEASE_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

let redis: Redis | null | undefined;
function checkoutStore(): CheckoutReservationStore | null {
  if (redis === undefined) {
    const configured = !!(
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    );
    try { redis = configured ? Redis.fromEnv() : null; }
    catch { redis = null; }
  }
  if (!redis) return null;
  const client = redis;
  return {
    claim: async (key, value, ttl) =>
      (await client.set(key, value, { nx: true, ex: ttl })) === 'OK',
    read: (key) => client.get(key),
    promote: async (key, expected, value, ttl) =>
      (await client.eval<string[], string | null>(
        PROMOTE_SCRIPT, [key], [expected, value, String(ttl)],
      )) === 'OK',
    release: async (key, expected) => {
      await client.eval(RELEASE_SCRIPT, [key], [expected]);
    },
  };
}

/** Fail closed when the shared Redis reservation store is unavailable. */
export async function getOrCreateCheckoutSession(args: {
  userId: string;
  plan: CheckoutPlan;
  createSession: Parameters<typeof createCheckoutSessionOnce>[3];
}): Promise<{ url: string }> {
  const store = checkoutStore();
  if (!store) throw new CheckoutGuardError('unavailable');
  return createCheckoutSessionOnce(store, args.userId, args.plan, args.createSession);
}
