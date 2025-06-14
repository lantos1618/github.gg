import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { 
  getAllRepoFiles, 
  getRepoData, 
  getFileContent,
  getFileTreeData,
  getCommitData,
  getCompareData,
  type FileProcessingOptions
} from "@/lib/github";
import { GitHubServiceError } from "@/lib/github";
import type { Context } from "./context";

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
const t = initTRPC.context<Context>().create({
  transformer: {
    serialize: (data) => JSON.stringify(data),
    deserialize: (data) => JSON.parse(data),
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
  github: createTRPCRouter({
    // Get repository data
    getRepo: publicProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          return await getRepoData(input.owner, input.repo);
        } catch (error) {
          if (error instanceof GitHubServiceError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch repository data',
              cause: error
            });
          }
          throw error;
        }
      }),

    // Get repository files
    getFiles: publicProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string().optional(),
        options: fileProcessingOptionsSchema,
      }))
      .query(async ({ input }) => {
        try {
          return await getAllRepoFiles(
            input.owner,
            input.repo,
            input.path || '',
            input.options
          );
        } catch (error) {
          if (error instanceof GitHubServiceError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch repository files',
              cause: error
            });
          }
          throw error;
        }
      }),

    // Get file content
    getFileContent: publicProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string(),
        ref: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await getFileContent(
            input.owner,
            input.repo,
            input.path,
            input.ref || 'main' // Default to 'main' branch if ref is not provided
          );
        } catch (error) {
          if (error instanceof GitHubServiceError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch file content',
              cause: error
            });
          }
          throw error;
        }
      }),

    // Get file tree
    getFileTree: publicProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
        path: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await getFileTreeData(
            input.owner,
            input.repo,
            input.branch,
            input.path || ''
          );
        } catch (error) {
          if (error instanceof GitHubServiceError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch file tree',
              cause: error
            });
          }
          throw error;
        }
      }),

    // Get commit history
    getCommits: publicProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string().optional(),
        sha: z.string().optional(),
        page: z.number().optional(),
        perPage: z.number().optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await getCommitData(
            input.owner,
            input.repo,
            input.path,
            input.sha,
            input.page,
            input.perPage
          );
        } catch (error) {
          if (error instanceof GitHubServiceError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch commits',
              cause: error
            });
          }
          throw error;
        }
      }),

    // Compare commits
    compareCommits: publicProcedure
      .input(z.object({
        owner: z.string(),
        repo: z.string(),
        base: z.string(),
        head: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          return await getCompareData(
            input.owner,
            input.repo,
            input.base,
            input.head
          );
        } catch (error) {
          if (error instanceof GitHubServiceError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to compare commits',
              cause: error
            });
          }
          throw error;
        }
      }),
  }),
  // Add other routers here
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
