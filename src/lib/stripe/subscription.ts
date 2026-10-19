import type Stripe from 'stripe';
import type { Plan } from '@/lib/utils/permissions';

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === 'string') return value;
  return value?.id ?? null;
}

/** Stripe moved billing periods from Subscription to SubscriptionItem in Basil. */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  const itemEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((end) => Number.isSafeInteger(end) && end > 0);

  // For mixed intervals, the subscription renews when its earliest item renews.
  const legacyEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const periodEnd = itemEnds.length > 0 ? Math.min(...itemEnds) : legacyEnd;
  if (!periodEnd || !Number.isSafeInteger(periodEnd)) {
    throw new Error(`Subscription ${subscription.id} has no billing period end`);
  }
  return new Date(periodEnd * 1000);
}

/** Invoice.subscription was moved under parent.subscription_details in Basil. */
export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const current = invoice.parent?.subscription_details?.subscription;
  if (current) return idOf(current);
  const legacy = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
  return idOf(legacy);
}

export function getSubscriptionPlan(subscription: Stripe.Subscription): Exclude<Plan, 'free'> | null {
  const priceIds = new Set(subscription.items.data.map((item) => item.price.id));
  if (process.env.STRIPE_PRO_PRICE_ID && priceIds.has(process.env.STRIPE_PRO_PRICE_ID)) return 'pro';
  if (process.env.STRIPE_BYOK_PRICE_ID && priceIds.has(process.env.STRIPE_BYOK_PRICE_ID)) return 'byok';
  return null;
}

export function getStripeId(value: string | { id: string }): string {
  const id = idOf(value);
  if (!id) throw new Error('Stripe object has no ID');
  return id;
}
