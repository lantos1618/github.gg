import { describe, expect, test } from 'bun:test';
import type Stripe from 'stripe';
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriodEnd,
  getSubscriptionPlan,
} from '@/lib/stripe/subscription';

function subscription(itemEnds: number[], legacyEnd?: number): Stripe.Subscription {
  return {
    id: 'sub_test',
    items: {
      data: itemEnds.map((end, index) => ({
        current_period_end: end,
        price: { id: index === 0 ? 'price_pro' : 'price_byok' },
      })),
    },
    ...(legacyEnd ? { current_period_end: legacyEnd } : {}),
  } as unknown as Stripe.Subscription;
}

describe('Stripe webhook subscription fields', () => {
  test('uses the earliest item period for Clover subscriptions', () => {
    const end = getSubscriptionPeriodEnd(subscription([1_800_000_000, 1_700_000_000]));
    expect(end.getTime()).toBe(1_700_000_000_000);
  });

  test('supports older subscription event shapes without item periods', () => {
    const end = getSubscriptionPeriodEnd(subscription([], 1_800_000_000));
    expect(end.getTime()).toBe(1_800_000_000_000);
  });

  test('fails closed when Stripe sends no billing period', () => {
    expect(() => getSubscriptionPeriodEnd(subscription([]))).toThrow('no billing period end');
  });

  test('extracts subscription ID from current and legacy invoices', () => {
    const current = {
      parent: { subscription_details: { subscription: { id: 'sub_new' } } },
    } as unknown as Stripe.Invoice;
    const legacy = { subscription: 'sub_old' } as unknown as Stripe.Invoice;
    expect(getInvoiceSubscriptionId(current)).toBe('sub_new');
    expect(getInvoiceSubscriptionId(legacy)).toBe('sub_old');
  });

  test('maps a subscription price to the plan', () => {
    const oldPro = process.env.STRIPE_PRO_PRICE_ID;
    const oldByok = process.env.STRIPE_BYOK_PRICE_ID;
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro';
    process.env.STRIPE_BYOK_PRICE_ID = 'price_byok';
    try {
      expect(getSubscriptionPlan(subscription([1_800_000_000]))).toBe('pro');
    } finally {
      if (oldPro === undefined) delete process.env.STRIPE_PRO_PRICE_ID;
      else process.env.STRIPE_PRO_PRICE_ID = oldPro;
      if (oldByok === undefined) delete process.env.STRIPE_BYOK_PRICE_ID;
      else process.env.STRIPE_BYOK_PRICE_ID = oldByok;
    }
  });
});
