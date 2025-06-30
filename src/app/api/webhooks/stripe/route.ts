import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { userSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const plan = session.metadata?.plan as 'byok' | 'pro';
          const userId = session.metadata?.userId;
          
          if (!userId || !plan) {
            console.error('Missing metadata in checkout session:', session.metadata);
            break;
          }

          // Log the subscription object for debugging
          console.log('Stripe subscription object:', JSON.stringify(subscription, null, 2));

          // Defensive: check for current_period_end
          const cpe = (subscription as any).current_period_end;
          if (!cpe || isNaN(Number(cpe))) {
            console.error('Stripe subscription missing or invalid current_period_end:', cpe, subscription);
            break;
          }

          // Create or update user subscription
          await db.insert(userSubscriptions).values({
            userId,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            plan,
            status: subscription.status,
            currentPeriodEnd: new Date(Number(cpe) * 1000),
          }).onConflictDoUpdate({
            target: userSubscriptions.userId,
            set: {
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              plan,
              status: subscription.status,
              currentPeriodEnd: new Date(Number(cpe) * 1000),
            }
          });

          console.log('Successfully saved subscription to database');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('Updating subscription:', subscription.id, 'status:', subscription.status);
        
        // Update subscription in database
        await db.update(userSubscriptions)
          .set({
            status: subscription.status,
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          })
          .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('Canceling subscription:', subscription.id);
        
        // Mark subscription as canceled
        await db.update(userSubscriptions)
          .set({ status: 'canceled' })
          .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        
        if (invoice.subscription && typeof invoice.subscription === 'string') {
          console.log('Payment failed for subscription:', invoice.subscription);
          
          // Mark subscription as past_due
          await db.update(userSubscriptions)
            .set({ status: 'past_due' })
            .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription));
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        
        if (invoice.subscription && typeof invoice.subscription === 'string') {
          console.log('Payment succeeded for subscription:', invoice.subscription);
          
          // Mark subscription as active
          await db.update(userSubscriptions)
            .set({ status: 'active' })
            .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription));
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 