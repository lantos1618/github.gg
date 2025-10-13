import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { webhookPreferences, githubAppInstallations, account, installationRepositories, tokenUsage } from '@/db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const webhooksRouter = router({
  // Get webhook preferences for user's installation
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    // Get user's installation ID
    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, ctx.user.id),
        eq(account.providerId, 'github')
      ),
    });

    if (!userAccount?.installationId) {
      return null;
    }

    // Get or create preferences
    let prefs = await db.query.webhookPreferences.findFirst({
      where: eq(webhookPreferences.installationId, userAccount.installationId),
    });

    if (!prefs) {
      // Create default preferences
      const [newPrefs] = await db.insert(webhookPreferences).values({
        installationId: userAccount.installationId,
        prReviewEnabled: true,
        autoUpdateEnabled: true,
        minScoreThreshold: null,
        // excludedRepos defaults to [] in SQL, no need to specify
      }).returning();
      prefs = newPrefs;
    }

    return prefs;
  }),

  // Update webhook preferences
  updatePreferences: protectedProcedure
    .input(z.object({
      prReviewEnabled: z.boolean().optional(),
      autoUpdateEnabled: z.boolean().optional(),
      minScoreThreshold: z.number().nullable().optional(),
      excludedRepos: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's installation ID
      const userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, ctx.user.id),
          eq(account.providerId, 'github')
        ),
      });

      if (!userAccount?.installationId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub App installation found. Please install the gh.gg app first.',
        });
      }

      // Update or insert preferences
      const existing = await db.query.webhookPreferences.findFirst({
        where: eq(webhookPreferences.installationId, userAccount.installationId),
      });

      if (existing) {
        const [updated] = await db
          .update(webhookPreferences)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(webhookPreferences.installationId, userAccount.installationId))
          .returning();
        return updated;
      } else {
        const [created] = await db.insert(webhookPreferences).values({
          installationId: userAccount.installationId,
          prReviewEnabled: input.prReviewEnabled ?? true,
          autoUpdateEnabled: input.autoUpdateEnabled ?? true,
          minScoreThreshold: input.minScoreThreshold ?? null,
          ...(input.excludedRepos ? { excludedRepos: input.excludedRepos } : {}),
        }).returning();
        return created;
      }
    }),

  // Get user's installation info
  getInstallationInfo: protectedProcedure.query(async ({ ctx }) => {
    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, ctx.user.id),
        eq(account.providerId, 'github')
      ),
    });

    if (!userAccount?.installationId) {
      return null;
    }

    const installation = await db.query.githubAppInstallations.findFirst({
      where: eq(githubAppInstallations.installationId, userAccount.installationId),
    });

    // If we have an installationId but no full record, return basic info
    if (!installation && userAccount.installationId) {
      return {
        installationId: userAccount.installationId,
        accountLogin: userAccount.accountId || 'Unknown',
        accountType: 'User',
        targetType: 'User',
      };
    }

    return installation;
  }),

  // Get repositories from user's installation
  getRepositories: protectedProcedure.query(async ({ ctx }) => {
    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, ctx.user.id),
        eq(account.providerId, 'github')
      ),
    });

    if (!userAccount?.installationId) {
      return [];
    }

    const repos = await db.query.installationRepositories.findMany({
      where: eq(installationRepositories.installationId, userAccount.installationId),
    });

    // Get webhook preferences to check excluded repos
    const prefs = await db.query.webhookPreferences.findFirst({
      where: eq(webhookPreferences.installationId, userAccount.installationId),
    });

    const excludedRepos = prefs?.excludedRepos || [];

    return repos.map(repo => ({
      ...repo,
      webhookEnabled: !excludedRepos.includes(repo.fullName),
    }));
  }),

  // Toggle webhook for a specific repository
  toggleRepoWebhook: protectedProcedure
    .input(z.object({
      repoFullName: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, ctx.user.id),
          eq(account.providerId, 'github')
        ),
      });

      if (!userAccount?.installationId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub App installation found.',
        });
      }

      // Get or create preferences
      let prefs = await db.query.webhookPreferences.findFirst({
        where: eq(webhookPreferences.installationId, userAccount.installationId),
      });

      if (!prefs) {
        const [newPrefs] = await db.insert(webhookPreferences).values({
          installationId: userAccount.installationId,
          prReviewEnabled: true,
          autoUpdateEnabled: true,
          minScoreThreshold: null,
          // excludedRepos defaults to [] in SQL, no need to specify
        }).returning();
        prefs = newPrefs;
      }

      const excludedRepos = prefs.excludedRepos || [];
      let updatedExcludedRepos: string[];

      if (input.enabled) {
        // Remove from excluded list
        updatedExcludedRepos = excludedRepos.filter(r => r !== input.repoFullName);
      } else {
        // Add to excluded list if not already there
        updatedExcludedRepos = excludedRepos.includes(input.repoFullName)
          ? excludedRepos
          : [...excludedRepos, input.repoFullName];
      }

      const [updated] = await db
        .update(webhookPreferences)
        .set({
          excludedRepos: updatedExcludedRepos,
          updatedAt: new Date(),
        })
        .where(eq(webhookPreferences.installationId, userAccount.installationId))
        .returning();

      return updated;
    }),

  // Get activity log with AI actions
  getActivityLog: protectedProcedure
    .input(z.object({
      startDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
      endDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
      feature: z.string().optional(),
      repoName: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tokenUsage.userId, ctx.user.id)];

      if (input.startDate) {
        conditions.push(gte(tokenUsage.createdAt, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(tokenUsage.createdAt, input.endDate));
      }

      const usage = await db.query.tokenUsage.findMany({
        where: conditions.length > 1 ? and(...conditions) : conditions[0],
        orderBy: desc(tokenUsage.createdAt),
        limit: input.limit,
      });

      // Filter by feature and repo name if provided
      let filteredUsage = usage;
      if (input.feature) {
        filteredUsage = filteredUsage.filter(u => u.feature === input.feature);
      }
      if (input.repoName) {
        filteredUsage = filteredUsage.filter(u =>
          u.repoName?.toLowerCase().includes(input.repoName!.toLowerCase())
        );
      }

      return {
        activities: filteredUsage,
        total: filteredUsage.length,
      };
    }),
});
