import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@/lib/auth';

/**
 * Inner context - always available in procedures
 */
interface CreateInnerContextOptions {
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
}

export async function createContextInner(opts?: CreateInnerContextOptions) {
  return {
    session: opts?.session ?? null,
  };
}

/**
 * Context for fetch adapter (used in App Router)
 */
export async function createContext(req: Request) {
  const session = await auth.api.getSession(req);
  const contextInner = await createContextInner({ session });
  
  return {
    ...contextInner,
    req,
  };
}

export type Context = Awaited<ReturnType<typeof createContextInner>> & { req: Request };

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure that requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});