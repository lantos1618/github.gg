import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import { createGitHubServiceFromSession } from '@/lib/github';
import { executeAnalysisWithVersioning } from '@/lib/trpc/helpers/analysis-executor';
import type { PgTable } from 'drizzle-orm/pg-core';

interface AnalysisRouterConfig<TData, TTable extends PgTable> {
  /** Name of the feature (e.g., 'scorecard', 'ai-slop') */
  featureName: string;

  /** Database table for this analysis type */
  table: TTable;

  /** Function to generate the analysis */
  generateFn: (input: { files: Array<{ path: string; content: string; size?: number }>; repoName: string }) => Promise<{ data: TData; usage?: any }>;

  /** Function to parse/validate the analysis data */
  parseSchema: (data: any) => TData;

  /** Build the insert values for the database */
  buildInsertValues: (data: TData, version: number, userId: string, input: any) => any;

  /** Build the response object from the inserted record */
  buildResponse: (record: any) => any;

  /** Key name for the response (e.g., 'scorecard', 'analysis') */
  responseKey: string;

  /** Error message prefix */
  errorMessage: string;

  /** Whether to include getAllAnalyzed endpoint */
  includeGetAll?: boolean;
}

export function createAnalysisRouter<TData, TTable extends PgTable>(
  config: AnalysisRouterConfig<TData, TTable>
) {
  const inputSchema = z.object({
    user: z.string(),
    repo: z.string(),
    ref: z.string().optional().default('main'),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      size: z.number().optional(),
    })),
  });

  const getInputSchema = z.object({
    user: z.string(),
    repo: z.string(),
    ref: z.string().optional().default('main'),
    version: z.number().optional(),
  });

  const versionsInputSchema = z.object({
    user: z.string(),
    repo: z.string(),
    ref: z.string().optional().default('main'),
  });

  const procedures: any = {
    // Generate analysis mutation
    generate: protectedProcedure
      .input(inputSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const { insertedRecord } = await executeAnalysisWithVersioning({
            userId: ctx.user.id,
            feature: config.featureName,
            repoOwner: input.user,
            repoName: input.repo,
            table: config.table as any,
            generateFn: async () => {
              const result = await config.generateFn({
                files: input.files,
                repoName: input.repo,
              });
              return {
                data: config.parseSchema(result.data),
                usage: result.usage,
              };
            },
            versioningConditions: [
              eq((config.table as any).userId, ctx.user.id),
              eq((config.table as any).repoOwner, input.user),
              eq((config.table as any).repoName, input.repo),
              eq((config.table as any).ref, input.ref || 'main'),
            ],
            buildInsertValues: (data, version) =>
              config.buildInsertValues(data, version, ctx.user.id, input),
          });

          return {
            [config.responseKey]: config.buildResponse(insertedRecord),
            cached: false,
            stale: false,
            lastUpdated: insertedRecord.updatedAt || new Date(),
          };
        } catch (error) {
          console.error(`🔥 Raw error in ${config.featureName} route:`, error);
          const userFriendlyMessage = error instanceof Error ? error.message : config.errorMessage;
          throw new Error(userFriendlyMessage);
        }
      }),

    // Public get analysis query
    publicGet: publicProcedure
      .input(getInputSchema)
      .query(async ({ input, ctx }) => {
        const { user, repo, ref, version } = input;

        // Check repository access and privacy
        try {
          const githubService = await createGitHubServiceFromSession(ctx.session);
          const repoInfo = await githubService.getRepositoryInfo(user, repo);

          // If the repository is private, check if user has access
          if (repoInfo.private === true) {
            // If user is not authenticated, block access
            if (!ctx.session?.user) {
              return {
                [config.responseKey]: null,
                cached: false,
                stale: false,
                lastUpdated: null,
                error: 'This repository is private'
              };
            }

            // User is authenticated, so they should have access (since we successfully fetched repo info)
            // Continue to show the analysis
          }
        } catch {
          // If we can't access the repo (404 or no auth), it might be private or user doesn't have access
          return {
            [config.responseKey]: null,
            cached: false,
            stale: false,
            lastUpdated: null,
            error: 'Unable to access repository'
          };
        }

        const baseConditions = [
          eq((config.table as any).repoOwner, user),
          eq((config.table as any).repoName, repo),
          eq((config.table as any).ref, ref),
        ];
        if (version !== undefined) {
          baseConditions.push(eq((config.table as any).version, version));
        }

        const cached = await db
          .select()
          .from(config.table)
          .where(and(...baseConditions))
          .orderBy(desc((config.table as any).updatedAt))
          .limit(1);

        if (cached.length > 0) {
          const record = cached[0];
          const isStale = new Date().getTime() - (record as any).updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
          return {
            [config.responseKey]: config.buildResponse(record),
            cached: true,
            stale: isStale,
            lastUpdated: (record as any).updatedAt,
          };
        }

        return {
          [config.responseKey]: null,
          cached: false,
          stale: false,
          lastUpdated: null,
        };
      }),

    // Get versions query
    getVersions: publicProcedure
      .input(versionsInputSchema)
      .query(async ({ input }) => {
        return await db
          .select({
            version: (config.table as any).version,
            updatedAt: (config.table as any).updatedAt
          })
          .from(config.table)
          .where(
            and(
              eq((config.table as any).repoOwner, input.user),
              eq((config.table as any).repoName, input.repo),
              eq((config.table as any).ref, input.ref)
            )
          )
          .orderBy(desc((config.table as any).version));
      }),
  };

  // Optionally add getAllAnalyzed endpoint
  if (config.includeGetAll) {
    procedures.getAllAnalyzed = publicProcedure
      .input(z.object({
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        const records = await db.select({
          repoOwner: (config.table as any).repoOwner,
          repoName: (config.table as any).repoName,
          ref: (config.table as any).ref,
          overallScore: (config.table as any).overallScore,
          metrics: (config.table as any).metrics,
          updatedAt: (config.table as any).updatedAt,
          version: (config.table as any).version,
        })
        .from(config.table)
        .orderBy(desc((config.table as any).updatedAt))
        .limit(input.limit)
        .offset(input.offset);

        // Group by repo (owner + name + ref) and take latest version
        const latestRepos = new Map<string, typeof records[0]>();
        for (const record of records) {
          const key = `${record.repoOwner}/${record.repoName}/${record.ref}`;
          const existing = latestRepos.get(key);
          if (!existing || record.version > existing.version) {
            latestRepos.set(key, record);
          }
        }

        return Array.from(latestRepos.values()).sort((a, b) =>
          b.updatedAt.getTime() - a.updatedAt.getTime()
        );
      });
  }

  return router(procedures);
}
