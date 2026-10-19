import { afterEach, expect, mock, test } from 'bun:test';
import { NextRequest } from 'next/server';

const originalSecretKey = process.env.STRIPE_SECRET_KEY;
const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
let stripeConstructed = false;
let databaseTouched = false;

mock.module('stripe', () => ({
  default: class {
    constructor() {
      stripeConstructed = true;
      throw new Error('The test must not construct a Stripe client');
    }
  },
}));

mock.module('../src/db', () => ({
  db: new Proxy({}, {
    get() {
      databaseTouched = true;
      throw new Error('The test must not access the database');
    },
  }),
}));

const { POST } = await import('../src/app/api/webhooks/stripe/route');

afterEach(() => {
  if (originalSecretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = originalSecretKey;
  if (originalWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
});

test('missing Stripe configuration returns a retryable response without handling the event', async () => {
  for (const [secretKey, webhookSecret] of [
    [undefined, 'whsec_test_only'],
    ['sk_test_only', undefined],
    [undefined, undefined],
  ] as const) {
    if (secretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = secretKey;
    if (webhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

    const response = await POST(new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-only' },
      body: '{}',
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Stripe webhook unavailable' });
  }

  expect(stripeConstructed).toBe(false);
  expect(databaseTouched).toBe(false);
});
