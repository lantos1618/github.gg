import { protectedProcedure } from '@/lib/trpc/trpc';
import { githubRouter } from '@/lib/trpc/routes/github';
import { insightsRouter } from '@/lib/trpc/routes/insights';
import { z } from 'zod';
import { router } from '@/lib/trpc/trpc';

export const appRouter = router({
  // Protected user routes
  me: protectedProcedure
    .query(({ ctx }) => {
      return {
        user: ctx.user,
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
  
  // Insights routes
  insights: insightsRouter,
});

export type AppRouter = typeof appRouter; 