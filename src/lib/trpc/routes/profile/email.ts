import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerEmails } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { isCurrentGitHubProfileOwner } from '@/lib/profile/service';

export const profileEmailRouter = router({
  getDeveloperEmail: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const normalizedUsername = input.username.toLowerCase();

      if (!await isCurrentGitHubProfileOwner(ctx.session, normalizedUsername)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      if (ctx.user.email) {
        return { email: ctx.user.email, source: 'database' };
      }

      // Cached developer email is visible only to that current GitHub user.
      const cachedEmail = await db.query.developerEmails.findFirst({
        where: eq(developerEmails.username, normalizedUsername),
      });
      if (cachedEmail?.email) {
        return { email: cachedEmail.email, source: 'cache' };
      }

      return { email: null as string | null, source: 'not_found' };
    }),
});
