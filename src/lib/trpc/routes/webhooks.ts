import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { webhookPreferences, githubAppInstallations, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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
        excludedRepos: [],
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
          message: 'No GitHub App installation found. Please install the GitHub.gg app first.',
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
          excludedRepos: input.excludedRepos ?? [],
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

    return installation;
  }),
});
