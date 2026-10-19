import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { userSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import Stripe from 'stripe';
import { getOrCreateCheckoutSession } from '@/lib/stripe/checkout-guard';
import { CheckoutGuardError } from '@/lib/stripe/checkout-guard-core';

// Initialize Stripe only if API key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })
  : null;

// Helper to check if Stripe is configured
const isStripeConfigured = () => {
  return !!process.env.STRIPE_SECRET_KEY;
};

// These statuses can still become active or resume billing. Starting another
// Checkout subscription would leave the first one charging the customer while
// our one-row-per-user table tracks only the newer subscription.
const terminalSubscriptionStatuses = new Set(['canceled', 'incomplete_expired']);

export const billingRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({
      plan: z.enum(['byok', 'pro'])
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Payment processing not configured in development mode'
        });
      }

      try {
        const existingSubscription = await db.query.userSubscriptions.findFirst({
          where: eq(userSubscriptions.userId, ctx.user.id),
        });

        if (existingSubscription && !terminalSubscriptionStatuses.has(existingSubscription.status)) {
          const portalSession = await stripe!.billingPortal.sessions.create({
            customer: existingSubscription.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
          });
          return { url: portalSession.url };
        }

        const priceId = input.plan === 'byok'
          ? process.env.STRIPE_BYOK_PRICE_ID
          : process.env.STRIPE_PRO_PRICE_ID;
        if (!priceId) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `${input.plan} plan price ID not configured`
          });
        }

        const session = await getOrCreateCheckoutSession({
          userId: ctx.user.id,
          plan: input.plan,
          createSession: ({ expiresAt, idempotencyKey }) => stripe!.checkout.sessions.create({
            customer_email: ctx.user.email,
            line_items: [{
              price: priceId,
              quantity: 1
            }],
            mode: 'subscription',
            expires_at: expiresAt,
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=1`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
            metadata: {
              userId: ctx.user.id,
              plan: input.plan
            }
          }, { idempotencyKey }),
        });

        return { url: session.url };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (error instanceof CheckoutGuardError) {
          throw new TRPCError({
            code: error.reason === 'unavailable' ? 'INTERNAL_SERVER_ERROR' : 'CONFLICT',
            message: error.message,
          });
        }
        console.error('Stripe billing session error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to open billing session'
        });
      }
    }),

  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, ctx.user.id)
      });

      return subscription ?? null;
    }),

  cancelSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Payment processing not configured in development mode' 
        });
      }

      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, ctx.user.id)
      });
      
      if (!subscription) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'No active subscription found' 
        });
      }

      try {
        await stripe!.subscriptions.cancel(subscription.stripeSubscriptionId);
        
        // Update subscription status in database
        await db.update(userSubscriptions)
          .set({ status: 'canceled' })
          .where(eq(userSubscriptions.id, subscription.id));
        
        return { success: true };
      } catch (error) {
        console.error('Stripe cancellation error:', error);
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to cancel subscription' 
        });
      }
    }),

  getBillingPortal: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Payment processing not configured in development mode' 
        });
      }

      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, ctx.user.id)
      });
      
      if (!subscription) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'No active subscription found' 
        });
      }

      try {
        const session = await stripe!.billingPortal.sessions.create({
          customer: subscription.stripeCustomerId,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
        });
        
        return { url: session.url };
      } catch (error) {
        console.error('Stripe billing portal error:', error);
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to create billing portal session' 
        });
      }
    }),
}); 
