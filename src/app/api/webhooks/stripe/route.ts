import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { userSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logging';
import {
  getInvoiceSubscriptionId,
  getStripeId,
  getSubscriptionPeriodEnd,
  getSubscriptionPlan,
} from '@/lib/stripe/subscription';
import type { Plan } from '@/lib/utils/permissions';

const logger = createLogger('StripeWebhook');

async function syncExistingSubscription(stripe: Stripe, subscriptionId: string) {
  // Webhooks can arrive out of order. Apply Stripe's current state rather than
  // an older event snapshot that could re-enable a canceled subscription.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = getSubscriptionPlan(subscription);
  await db.update(userSubscriptions)
    .set({
      status: subscription.status,
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      ...(plan ? { plan } : {}),
    })
    .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secretKey || !webhookSecret) {
    logger.error('Stripe webhook is not configured');
    return NextResponse.json({ error: 'Stripe webhook unavailable' }, { status: 503 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-09-30.clover',
  });

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = getStripeId(session.subscription);
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const metadataPlan = session.metadata?.plan;
          const userId = session.metadata?.userId;
          
          if (!userId || (metadataPlan !== 'pro' && metadataPlan !== 'byok')) {
            throw new Error(`Checkout session ${session.id} is missing subscription metadata`);
          }

          const pricePlan = getSubscriptionPlan(subscription);
          if (pricePlan && pricePlan !== metadataPlan) {
            logger.warn('Checkout plan changed since session creation', { sessionId: session.id, subscriptionId });
          }
          const plan = (pricePlan ?? metadataPlan) as Plan;

          // Never replace the ID of a tracked live subscription: the older
          // charge would disappear from the user's billing controls.
          const existing = await db.query.userSubscriptions.findFirst({
            where: eq(userSubscriptions.userId, userId),
          });
          if (existing && existing.stripeSubscriptionId !== subscriptionId && existing.status !== 'canceled') {
            throw new Error(`User ${userId} already has a tracked subscription`);
          }

          // Create or update user subscription
          const periodEnd = getSubscriptionPeriodEnd(subscription);
          await db.insert(userSubscriptions).values({
            userId,
            stripeCustomerId: getStripeId(subscription.customer),
            stripeSubscriptionId: subscription.id,
            plan,
            status: subscription.status,
            currentPeriodEnd: periodEnd,
          }).onConflictDoUpdate({
            target: userSubscriptions.userId,
            set: {
              stripeCustomerId: getStripeId(subscription.customer),
              stripeSubscriptionId: subscription.id,
              plan,
              status: subscription.status,
              currentPeriodEnd: periodEnd,
            }
          });

           logger.info('Successfully saved subscription to database', { userId, plan, subscriptionId: subscription.id });
          }
          break;
          }

          case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;

          logger.info('Updating subscription', { subscriptionId: subscription.id, status: subscription.status });

        await syncExistingSubscription(stripe, subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        logger.info('Canceling subscription', { subscriptionId: subscription.id });
        
        await syncExistingSubscription(stripe, subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = getInvoiceSubscriptionId(invoice);
        if (subId) {
          logger.warn('Payment failed for subscription', { subscriptionId: subId });
          await syncExistingSubscription(stripe, subId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = getInvoiceSubscriptionId(invoice);
        if (subId) {
          logger.info('Payment succeeded for subscription', { subscriptionId: subId });
          await syncExistingSubscription(stripe, subId);
        }
        break;
      }

      default:
        logger.debug(`Unhandled event type: ${event.type}`, { eventType: event.type });
      }

      return NextResponse.json({ received: true });
      } catch (error) {
      logger.error('Webhook processing error', error);
      return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
      );
      }
      }
