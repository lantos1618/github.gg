import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { Context } from './trpc';

const t = initTRPC.context<Context>().create();

/**
 * Middleware to check if the user is an admin
 * Only allows access if the user's email is in the ADMIN_EMAILS environment variable
 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access admin features',
    });
  }

  // Check if user's email is in the admin emails list
  const adminEmails = process.env.ADMIN_EMAILS!.split(',').map(email => email.trim());
  if (!adminEmails.includes(ctx.session.user.email)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have admin access',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
}); 