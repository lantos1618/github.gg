import { type inferAsyncReturnType } from '@trpc/server';
import { type Session } from 'next-auth';
import type { NextRequest } from 'next/server';

/**
 * Defines the inner context type for your tRPC procedures.
 * This includes the data you want to make available in all your procedures.
 */
interface CreateInnerContextOptions {
  session: Session | null;
  req: NextRequest;
  resHeaders: Headers;
  // Add any other context properties you need
}

/**
 * Inner context. Will always be available in your procedures, in contrast to the outer context.
 *
 * Also useful for:
 * - testing, so you don't have to mock Next.js' `req`/`res`
 * - tRPC's `createServerSideHelpers` where we don't have `req`/`res`
 */
const createContextInner = (opts: CreateInnerContextOptions) => {
  return {
    session: opts.session,
    req: opts.req,
    resHeaders: opts.resHeaders,
    // Add any other context properties here
  };
};

/**
 * Creates the tRPC context for the API handler.
 * This is where you can add any data that should be available in your procedures.
 */
export const createTRPCContext = async (opts: {
  req: NextRequest;
  resHeaders: Headers;
}) => {
  const { req, resHeaders } = opts;
  
  // Get the session if using NextAuth.js
  const session = null; // Replace with your session logic if using NextAuth

  return createContextInner({
    session,
    req,
    resHeaders,
  });
};

// Export the context type for use in your routers
export type Context = inferAsyncReturnType<typeof createTRPCContext>;
