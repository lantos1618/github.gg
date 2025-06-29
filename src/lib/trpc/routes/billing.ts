import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db';
import { userSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// We'll need to install and configure Stripe
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const billingRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({ 
      plan: z.enum(['byok', 'pro']) 
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement Stripe checkout session creation
      // const session = await stripe.checkout.sessions.create({
      //   customer_email: ctx.user.email,
      //   line_items: [{ 
      //     price: input.plan === 'byok' 
      //       ? process.env.STRIPE_BYOK_PRICE_ID 
      //       : process.env.STRIPE_PRO_PRICE_ID, 
      //     quantity: 1 
      //   }],
      //   mode: 'subscription',
      //   success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
      //   cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      //   metadata: { userId: ctx.user.id, plan: input.plan }
      // });
      
      // return { url: session.url };
      
      // Placeholder for now
      throw new TRPCError({ 
        code: 'NOT_IMPLEMENTED', 
        message: 'Stripe integration not yet implemented' 
      });
    }),

  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, ctx.user.id)
      });
      
      return subscription;
    }),

  cancelSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      // TODO: Implement Stripe subscription cancellation
      // const subscription = await db.query.userSubscriptions.findFirst({
      //   where: eq(userSubscriptions.userId, ctx.user.id)
      // });
      
      // if (subscription) {
      //   await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      // }
      
      throw new TRPCError({ 
        code: 'NOT_IMPLEMENTED', 
        message: 'Stripe integration not yet implemented' 
      });
    }),

  getBillingPortal: protectedProcedure
    .mutation(async ({ ctx }) => {
      // TODO: Implement Stripe billing portal
      // const subscription = await db.query.userSubscriptions.findFirst({
      //   where: eq(userSubscriptions.userId, ctx.user.id)
      // });
      
      // if (!subscription) {
      //   throw new TRPCError({ 
      //     code: 'NOT_FOUND', 
      //     message: 'No active subscription found' 
      //   });
      // }
      
      // const session = await stripe.billingPortal.sessions.create({
      //   customer: subscription.stripeCustomerId,
      //   return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      // });
      
      // return { url: session.url };
      
      throw new TRPCError({ 
        code: 'NOT_IMPLEMENTED', 
        message: 'Stripe integration not yet implemented' 
      });
    }),
}); 