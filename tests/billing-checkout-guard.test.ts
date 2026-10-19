import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const previousEnv = {
  stripeKey: process.env.STRIPE_SECRET_KEY,
  proPrice: process.env.STRIPE_PRO_PRICE_ID,
  byokPrice: process.env.STRIPE_BYOK_PRICE_ID,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
};
process.env.STRIPE_SECRET_KEY = 'sk_test_billing_guard';
process.env.STRIPE_PRO_PRICE_ID = 'price_pro_test';
process.env.STRIPE_BYOK_PRICE_ID = 'price_byok_test';
process.env.NEXT_PUBLIC_APP_URL = 'https://www.github.gg';

let existingSubscription: { status: string; stripeCustomerId: string } | null = null;
const checkoutCreate = mock(async (...args: unknown[]) => {
  void args;
  return { url: 'https://checkout.stripe.com/new' };
});
const portalCreate = mock(async () => ({ url: 'https://billing.stripe.com/existing' }));
const guardedCheckout = mock(async ({ createSession }: {
  createSession: (args: { expiresAt: number; idempotencyKey: string }) => Promise<{ url: string | null }>;
}) => {
  const session = await createSession({ expiresAt: 2_000_000_000, idempotencyKey: 'test-checkout-key' });
  return { url: session.url! };
});

mock.module('../src/lib/auth', () => ({ auth: { api: { getSession: async () => null } } }));
mock.module('../src/db', () => ({
  db: {
    query: {
      userSubscriptions: {
        findFirst: async () => existingSubscription,
      },
    },
  },
}));
mock.module('stripe', () => ({
  default: class {
    checkout = { sessions: { create: checkoutCreate } };
    billingPortal = { sessions: { create: portalCreate } };
  },
}));
mock.module('../src/lib/stripe/checkout-guard', () => ({ getOrCreateCheckoutSession: guardedCheckout }));

const { billingRouter } = await import('../src/lib/trpc/routes/billing');
const caller = billingRouter.createCaller({
  session: { user: { id: 'billing-user', email: 'billing-user@example.com' } },
  req: new Request('https://www.github.gg/api/trpc'),
} as Parameters<typeof billingRouter.createCaller>[0]);

beforeEach(() => {
  existingSubscription = null;
  checkoutCreate.mockClear();
  portalCreate.mockClear();
  guardedCheckout.mockClear();
});

describe('billing Checkout duplicate subscription guard', () => {
  for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete']) {
    test(`${status} subscription opens the existing customer portal`, async () => {
      existingSubscription = { status, stripeCustomerId: 'cus_existing' };

      const result = await caller.createCheckoutSession({ plan: 'pro' });

      expect(result.url).toBe('https://billing.stripe.com/existing');
      expect(portalCreate).toHaveBeenCalledWith({
        customer: 'cus_existing',
        return_url: 'https://www.github.gg/settings',
      });
      expect(checkoutCreate).not.toHaveBeenCalled();
      expect(guardedCheckout).not.toHaveBeenCalled();
    });
  }

  for (const status of [null, 'canceled', 'incomplete_expired'] as const) {
    test(`${status ?? 'new user'} can start one Checkout session`, async () => {
      existingSubscription = status ? { status, stripeCustomerId: 'cus_old' } : null;

      const result = await caller.createCheckoutSession({ plan: 'pro' });

      expect(result.url).toBe('https://checkout.stripe.com/new');
      expect(checkoutCreate).toHaveBeenCalledTimes(1);
      expect(checkoutCreate.mock.calls[0]?.[0]).toMatchObject({
        line_items: [{ price: 'price_pro_test', quantity: 1 }],
        mode: 'subscription',
        expires_at: 2_000_000_000,
        success_url: 'https://www.github.gg/settings?upgraded=1',
        metadata: { userId: 'billing-user', plan: 'pro' },
      });
      expect(checkoutCreate.mock.calls[0]?.[1]).toEqual({ idempotencyKey: 'test-checkout-key' });
      expect(guardedCheckout).toHaveBeenCalledTimes(1);
      expect(portalCreate).not.toHaveBeenCalled();
    });
  }

  test('an existing subscriber can reach the portal even when a new-plan price is unavailable', async () => {
    existingSubscription = { status: 'active', stripeCustomerId: 'cus_existing' };
    delete process.env.STRIPE_PRO_PRICE_ID;
    try {
      const result = await caller.createCheckoutSession({ plan: 'pro' });
      expect(result.url).toBe('https://billing.stripe.com/existing');
      expect(checkoutCreate).not.toHaveBeenCalled();
    } finally {
      process.env.STRIPE_PRO_PRICE_ID = 'price_pro_test';
    }
  });
});

afterAll(() => {
  for (const [name, value] of Object.entries({
    STRIPE_SECRET_KEY: previousEnv.stripeKey,
    STRIPE_PRO_PRICE_ID: previousEnv.proPrice,
    STRIPE_BYOK_PRICE_ID: previousEnv.byokPrice,
    NEXT_PUBLIC_APP_URL: previousEnv.appUrl,
  })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
