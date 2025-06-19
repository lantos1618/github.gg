import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { 
  getAllRepoFilesWithTar, 
  getRepoData, 
  getFileContent,
  getFileTreeData,
  getCommitData,
  getCompareData,
  searchRepositories,
  getRepoIssues,
  getIssueData,
  type FileProcessingOptions,
  GitHubServiceError,
  getRepoWorkflows,
  getRepoWorkflowRuns,
  getRepoPullRequests,
  getRepoEvents
} from "@/lib/github";
import { publicProcedure, protectedProcedure, createTRPCRouter } from "../router";

// File processing options schema
const fileProcessingOptionsSchema = z.object({
  maxFileSize: z.number().optional(),
  maxFiles: z.number().optional(),
  includeExtensions: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
  includeContent: z.boolean().optional(),
}).optional();

export const githubRouter = createTRPCRouter({
  // Search repositories
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1, 'Search query is required'),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(10),
      sort: z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }))
    .query(async ({ input }) => {
      try {
        const result = await searchRepositories(
          input.query,
          {
            page: input.page,
            perPage: input.perPage,
            sort: input.sort,
            order: input.order,
          }
        );
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error('Search error:', error);
        if (error instanceof GitHubServiceError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
            cause: error,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search repositories',
          cause: error,
        });
      }
    }),

  // Get repository data
  getRepo: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const accessToken = ctx.session.user.accessToken;
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
      branch: z.string().optional(),
      options: fileProcessingOptionsSchema,
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Use accessToken from session if available, otherwise undefined
        const accessToken = ctx.session?.user?.accessToken || undefined;
        return await getAllRepoFilesWithTar(
          input.owner,
          input.repo,
          input.branch,
          accessToken,
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
  getFileContent: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      ref: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const accessToken = ctx.session.user.accessToken;
        return await getFileContent(
          input.owner,
          input.repo,
          input.ref || 'main',
          input.path,
          accessToken
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

  // Get file tree data
  getFileTree: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string().optional(),
      path: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await getFileTreeData(
          input.owner,
          input.repo,
          input.branch || 'main',
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

  // Get commit data
  getCommits: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string().optional(),
      sha: z.string().optional(),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(30),
      since: z.string().optional(),
      until: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const accessToken = ctx.session.user.accessToken;
        return await getCommitData(input.owner, input.repo, {
          path: input.path,
          sha: input.sha,
          page: input.page,
          perPage: input.perPage,
          since: input.since,
          until: input.until,
          accessToken
        });
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

  // Get compare data
  getCompare: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      base: z.string(),
      head: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        return await getCompareData(input.owner, input.repo, input.base, input.head);
      } catch (error) {
        if (error instanceof GitHubServiceError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch compare data',
            cause: error
          });
        }
        throw error;
      }
    }),

  // Get repository issues
  getIssues: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      page: z.number().min(1).default(1),
      state: z.enum(['open', 'closed', 'all']).default('open'),
      perPage: z.number().min(1).max(100).default(10),
    }))
    .query(async ({ input }) => {
      try {
        return await getRepoIssues(input.owner, input.repo, {
          page: input.page,
          state: input.state,
          perPage: input.perPage,
        });
      } catch (error) {
        if (error instanceof GitHubServiceError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch issues',
            cause: error
          });
        }
        throw error;
      }
    }),

  // Get single issue
  getIssue: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      issueNumber: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        return await getIssueData(input.owner, input.repo, input.issueNumber);
      } catch (error) {
        if (error instanceof GitHubServiceError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch issue',
            cause: error
          });
        }
        throw error;
      }
    }),

  // Get repository workflows
  getWorkflows: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const accessToken = ctx.session.user.accessToken;
        return await getRepoWorkflows(input.owner, input.repo, accessToken);
      } catch (error) {
        if (error instanceof GitHubServiceError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch workflows',
            cause: error
          });
        }
        throw error;
      }
    }),

  // Get repository workflow runs
  getWorkflowRuns: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      workflowId: z.number().optional(),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(30),
      status: z.enum(['completed', 'action_required', 'cancelled', 'failure', 'neutral', 'skipped', 'stale', 'success', 'timed_out', 'in_progress', 'queued', 'requested', 'waiting', 'pending']).optional(),
      branch: z.string().optional(),
      event: z.string().optional(),
      actor: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const accessToken = ctx.session.user.accessToken;
        return await getRepoWorkflowRuns(input.owner, input.repo, input.workflowId, {
          page: input.page,
          perPage: input.perPage,
          status: input.status,
          branch: input.branch,
          event: input.event,
          actor: input.actor,
        });
      } catch (error) {
        if (error instanceof GitHubServiceError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch workflow runs',
            cause: error
          });
        }
        throw error;
      }
    }),

  // Get repository pull requests
  getPullRequests: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      page: z.number().min(1).default(1),
      state: z.enum(['open', 'closed', 'all']).default('open'),
      perPage: z.number().min(1).max(100).default(30),
      sort: z.enum(['created', 'updated', 'popularity', 'long-running']).default('created'),
      direction: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const accessToken = ctx.session.user.accessToken;
        return await getRepoPullRequests(input.owner, input.repo, {
          page: input.page,
          state: input.state,
          perPage: input.perPage,
          sort: input.sort,
          direction: input.direction,
        });
      } catch (error) {
        if (error instanceof GitHubServiceError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch pull requests',
            cause: error
          });
        }
        throw error;
      }
    }),

  // Get repository events
  getEvents: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(30),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const accessToken = ctx.session.user.accessToken;
        return await getRepoEvents(input.owner, input.repo, {
          page: input.page,
          perPage: input.perPage,
        });
      } catch (error) {
        if (error instanceof GitHubServiceError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch repository events',
            cause: error
          });
        }
        throw error;
      }
    }),
}); 