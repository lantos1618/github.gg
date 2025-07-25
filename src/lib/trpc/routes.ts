import { protectedProcedure } from '@/lib/trpc/trpc';
import { githubRouter } from '@/lib/trpc/routes/github/index';
import { scorecardRouter } from '@/lib/trpc/routes/scorecard';
import { diagramRouter } from '@/lib/trpc/routes/diagram';
import { profileRouter } from '@/lib/trpc/routes/profile';
import { arenaRouter } from '@/lib/trpc/routes/arena';
import { userRouter } from '@/lib/trpc/routes/user';
import { featuredRouter } from '@/lib/trpc/routes/featured';
import { billingRouter } from '@/lib/trpc/routes/billing';
import { adminRouter } from '@/lib/trpc/routes/admin';
import { z } from 'zod';
import { router } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { githubAppInstallations } from '@/db/schema';

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
        githubUsername = installation?.accountLogin;
      }

      return {
        user: {
          ...ctx.user,
          githubUsername,
        },
        message: 'You are authenticated!',
      };
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      bio: z.string().optional(),
    }))
    .mutation(async ({ ctx }) => {
      // TODO: Update user profile in database
      console.log('Updating profile for user:', ctx.user);
      
      return {
        success: true,
        message: 'Profile updated',
        user: ctx.user,
      };
    }),

  // GitHub routes
  github: githubRouter,
  
  // Scorecard routes
  scorecard: scorecardRouter,
  
  // Diagram routes
  diagram: diagramRouter,

  // Profile routes
  profile: profileRouter,

  // Arena routes
  arena: arenaRouter,

  // User management routes
  user: userRouter,

  // Featured repositories routes
  featured: featuredRouter,

  // Billing routes
  billing: billingRouter,

  // Admin routes
  admin: adminRouter,
});

export type AppRouter = typeof appRouter; 