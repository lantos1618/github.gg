import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { GitHubServiceError } from "@/lib/github";
import type { Context } from "./context";
import { githubRouter } from "./routers/github-router";

/**
 * 1. CONTEXT
 *
 * This section defines the "context" that is available to all tRPC procedures.
 */

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: {
    serialize: (data) => superjson.serialize(data),
    deserialize: (data) => superjson.deserialize(data),
  },
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

/**
 * Reusable middleware that enforces users are logged in before running the procedure.
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// File processing options schema
const fileProcessingOptionsSchema = z.object({
  maxFileSize: z.number().optional(),
  maxFiles: z.number().optional(),
  includeExtensions: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
  includeContent: z.boolean().optional(),
}).optional();

// Create the main app router
export const appRouter = createTRPCRouter({
  github: githubRouter,
  // Add other routers here
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
