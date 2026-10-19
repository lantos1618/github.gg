import { randomUUID } from 'crypto';

export type CheckoutPlan = 'pro' | 'byok';

export interface CheckoutReservationStore {
  claim(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  read(key: string): Promise<unknown>;
  promote(key: string, expected: string, value: string, ttlSeconds: number): Promise<boolean>;
  release(key: string, expected: string): Promise<void>;
}

export class CheckoutGuardError extends Error {
  constructor(public readonly reason: 'in_progress' | 'plan_conflict' | 'unavailable') {
    super(reason === 'plan_conflict'
      ? 'A checkout for another plan is already open. Please complete it or try again later.'
      : reason === 'in_progress'
        ? 'Your checkout is being prepared. Please try again shortly.'
        : 'Checkout is temporarily unavailable. Please try again shortly.');
  }
}

type PendingCheckout =
  | { state: 'creating'; plan: CheckoutPlan; nonce: string }
  | { state: 'ready'; plan: CheckoutPlan; url: string; expiresAt: number };

// Longer than the tRPC Vercel function's five-minute maximum duration.
const CREATING_TTL_SECONDS = 360;
// Stripe requires at least 30 minutes; five extra minutes cover request latency.
const SESSION_LIFETIME_SECONDS = 35 * 60;
const READY_EXPIRY_MARGIN_SECONDS = 60;

function parsePending(raw: unknown): PendingCheckout | null {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    if (record.plan !== 'pro' && record.plan !== 'byok') return null;
    if (record.state === 'creating' && typeof record.nonce === 'string') {
      return { state: 'creating', plan: record.plan, nonce: record.nonce };
    }
    if (record.state === 'ready' && typeof record.url === 'string' &&
        typeof record.expiresAt === 'number' && Number.isFinite(record.expiresAt)) {
      return { state: 'ready', plan: record.plan, url: record.url, expiresAt: record.expiresAt };
    }
    return null;
  } catch {
    return null;
  }
}

/** One open Stripe Checkout Session per user, across all plans and instances. */
export async function createCheckoutSessionOnce(
  store: CheckoutReservationStore | null,
  userId: string,
  plan: CheckoutPlan,
  createSession: (args: { expiresAt: number; idempotencyKey: string }) => Promise<{
    url: string | null;
    expires_at: number;
  }>,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<{ url: string }> {
  if (!store || !userId) throw new CheckoutGuardError('unavailable');

  const key = `billing:checkout:${userId}`;
  const nonce = randomUUID();
  const claim = JSON.stringify({ state: 'creating', plan, nonce } satisfies PendingCheckout);

  let acquired: boolean;
  try {
    acquired = await store.claim(key, claim, CREATING_TTL_SECONDS);
  } catch {
    throw new CheckoutGuardError('unavailable');
  }

  if (!acquired) {
    let pending: PendingCheckout | null;
    try {
      pending = parsePending(await store.read(key));
    } catch {
      throw new CheckoutGuardError('unavailable');
    }
    if (!pending) throw new CheckoutGuardError('in_progress');
    if (pending.plan !== plan) throw new CheckoutGuardError('plan_conflict');
    if (pending.state === 'creating' || pending.expiresAt <= nowSeconds) {
      throw new CheckoutGuardError('in_progress');
    }
    return { url: pending.url };
  }

  let session: Awaited<ReturnType<typeof createSession>>;
  try {
    session = await createSession({
      expiresAt: nowSeconds + SESSION_LIFETIME_SECONDS,
      idempotencyKey: `checkout:${nonce}`,
    });
  } catch (error) {
    // Release only this attempt's claim. A later attempt must never be erased.
    try { await store.release(key, claim); } catch { /* TTL still clears it. */ }
    throw error;
  }

  if (!session.url || !Number.isSafeInteger(session.expires_at) ||
      session.expires_at <= nowSeconds) {
    // The URL has not been given to a user; the temporary claim can expire.
    throw new CheckoutGuardError('unavailable');
  }

  const ready = JSON.stringify({
    state: 'ready', plan, url: session.url, expiresAt: session.expires_at,
  } satisfies PendingCheckout);
  const ttl = Math.max(1, session.expires_at - nowSeconds + READY_EXPIRY_MARGIN_SECONDS);
  try {
    if (!(await store.promote(key, claim, ready, ttl))) {
      throw new CheckoutGuardError('unavailable');
    }
  } catch {
    // Do not return an unreserved payable URL if Redis failed after creation.
    throw new CheckoutGuardError('unavailable');
  }

  return { url: session.url };
}
