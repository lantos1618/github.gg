import { type inferAsyncReturnType } from '@trpc/server';
import type { Session } from 'next-auth';
import type { NextRequest } from 'next/server';
import { isAuthenticated } from '../../lib/auth/utils';
import type { AuthenticatedUser, AuthenticatedSession } from '../../lib/auth/types';

// Re-export auth types for convenience
export type { AuthenticatedUser, AuthenticatedSession } from '../../lib/auth/types';

// Helper types for authenticated context
export type AuthenticatedContext = {
  user: AuthenticatedUser;
  accessToken: string;
  session: AuthenticatedSession;
};

// Base context type for all procedures
export type BaseContext = {
  session: Session | null;
  req: NextRequest;
  resHeaders: Headers;
};

/**
 * Defines the inner context type for your tRPC procedures.
 * This includes the data you want to make available in all your procedures.
 */
interface CreateInnerContextOptions {
  session: Session | null;
  req: NextRequest;
  resHeaders: Headers;
  // Add any other context properties you need
  user?: AuthenticatedUser;
  accessToken?: string;
}

/**
 * Inner context. Will always be available in your procedures, in contrast to the outer context.
 *
 * Also useful for:
 * - testing, so you don't have to mock Next.js' `req`/`res`
 * - tRPC's `createServerSideHelpers` where we don't have `req`/`res`
 */
const createContextInner = (opts: CreateInnerContextOptions) => {
  const context = {
    session: opts.session,
    req: opts.req,
    resHeaders: opts.resHeaders,
    // Add any other context properties here
  };

  // If we have a user and access token in the options, add them to the context
  if (opts.user && opts.accessToken) {
    return {
      ...context,
      user: opts.user,
      accessToken: opts.accessToken,
    };
  }

  // If we have a session with an access token, add it to the context
  if (isAuthenticated(opts.session)) {
    return {
      ...context,
      user: opts.session.user,
      accessToken: opts.session.user.accessToken,
    };
  }

  return context;
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
