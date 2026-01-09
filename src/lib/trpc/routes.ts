import { protectedProcedure } from '@/lib/trpc/trpc';
import { githubRouter } from '@/lib/trpc/routes/github/index';
import { scorecardRouter } from '@/lib/trpc/routes/scorecard';
import { aiSlopRouter } from '@/lib/trpc/routes/ai-slop';
import { diagramRouter } from '@/lib/trpc/routes/diagram';
import { profileRouter } from '@/lib/trpc/routes/profile';
import { arenaRouter } from '@/lib/trpc/routes/arena';
import { scoreHistoryRouter } from '@/lib/trpc/routes/score-history';
import { userRouter } from '@/lib/trpc/routes/user';
import { featuredRouter } from '@/lib/trpc/routes/featured';
import { billingRouter } from '@/lib/trpc/routes/billing';
import { adminRouter } from '@/lib/trpc/routes/admin';
import { webhooksRouter } from '@/lib/trpc/routes/webhooks';
import { githubAnalysisRouter } from '@/lib/trpc/routes/github-analysis';
import { wikiRouter } from '@/lib/trpc/routes/wiki';
import { wrappedRouter } from '@/lib/trpc/routes/wrapped';
import { apiKeysRouter } from '@/lib/trpc/routes/api-keys';
import { hireRouter } from '@/lib/trpc/routes/hire';
import { z } from 'zod';
import { router } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { account, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { githubAppInstallations } from '@/db/schema';
import { TRPCError } from '@trpc/server';

export const appRouter = router({
  // Protected user routes
  me: protectedProcedure
    .query(async ({ ctx }) => {
      // Get the GitHub username (login) from the githubAppInstallations table via the user's account
      const userAccount = await db.query.account.findFirst({
        where: eq(account.userId, ctx.user.id),
        columns: {
          installationId: true,
        },
      });

      let githubUsername: string | undefined = undefined;
      if (userAccount?.installationId) {
        const installation = await db.query.githubAppInstallations.findFirst({
          where: eq(githubAppInstallations.installationId, userAccount.installationId),
          columns: { accountLogin: true },
        });
        if (installation?.accountLogin) {
          githubUsername = installation.accountLogin;
        }
      }

      return {
        user: {
          ...ctx.user,
          // Prefer installation username, fallback to DB username (if available in ctx.user)
          githubUsername: githubUsername || (ctx.user as any).githubUsername,
        },
        message: 'You are authenticated!',
      };
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Partial<{ name: string }> = {};

      if (input.name !== undefined) {
        updates.name = input.name;
      }

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update',
        });
      }

      await db
        .update(user)
        .set(updates)
        .where(eq(user.id, ctx.user.id));

      // Fetch updated user
      const updatedUser = await db.query.user.findFirst({
        where: eq(user.id, ctx.user.id),
      });

      return {
        success: true,
        message: 'Profile updated',
        user: updatedUser,
      };
    }),

  // GitHub routes
  github: githubRouter,
  
  // Scorecard routes
  scorecard: scorecardRouter,

  // AI Slop detection routes
  aiSlop: aiSlopRouter,

  // Diagram routes
  diagram: diagramRouter,

  // Profile routes
  profile: profileRouter,

  // Arena routes
  arena: arenaRouter,
  scoreHistory: scoreHistoryRouter,

  // User management routes
  user: userRouter,

  // Featured repositories routes
  featured: featuredRouter,

  // Billing routes
  billing: billingRouter,

  // Admin routes
  admin: adminRouter,

  // Webhook settings routes
  webhooks: webhooksRouter,

  // GitHub PR and Issue analysis routes
  githubAnalysis: githubAnalysisRouter,

  // Wiki documentation routes
  wiki: wikiRouter,

  // GitHub Wrapped routes
  wrapped: wrappedRouter,

  // Public API key management
  apiKeys: apiKeysRouter,

  // Hiring/job matching
  hire: hireRouter,
});

export type AppRouter = typeof appRouter; 