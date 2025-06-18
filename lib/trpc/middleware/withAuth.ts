import { TRPCError } from '@trpc/server';
import { isAuthenticated, requireAccessToken } from '../../../lib/auth/utils';
import type { Context, AuthenticatedContext, AuthenticatedSession } from '../context';

// This is needed because the types from @trpc/server are not directly importable
type MiddlewareFunction = any;

/**
 * Middleware that enforces the user is authenticated
 * and adds the access token to the context
 */
/**
 * Middleware that enforces the user is authenticated
 * and adds the access token to the context
 */
export const withAuth = <T extends { ctx: Context }>(
  opts: T,
  next: (opts: T & { ctx: T['ctx'] & AuthenticatedContext }) => Promise<any>
) => {
  const { ctx } = opts;
  
  if (!ctx.session || !isAuthenticated(ctx.session)) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource' 
    });
  }

  const accessToken = requireAccessToken(ctx.session);
  
  return next({
    ...opts,
    ctx: {
      ...ctx,
      session: ctx.session as AuthenticatedSession,
      user: ctx.session.user,
      accessToken
    } as any // We need to cast here because of TypeScript limitations with intersection types
  });
};

/**
 * Creates a protected procedure with authenticated context
 */
export function createProtectedProcedure(procedure: any) {
  return procedure.use(async ({ ctx, next }: { ctx: Context; next: any }) => {
    if (!ctx.session || !isAuthenticated(ctx.session)) {
      throw new TRPCError({ 
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource' 
      });
    }

    const accessToken = requireAccessToken(ctx.session);
    
    return next({
      ctx: {
        ...ctx,
        session: ctx.session as AuthenticatedSession,
        user: ctx.session.user,
        accessToken
      } as any // We need to cast here because of TypeScript limitations with intersection types
    });
  });
}
