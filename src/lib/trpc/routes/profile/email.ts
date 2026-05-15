import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { user, developerEmails } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const profileEmailRouter = router({
  getDeveloperEmail: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const normalizedUsername = input.username.toLowerCase();

      // 1. Check if the user is registered on our platform by username
      const registeredUser = await db.query.user.findFirst({
        where: eq(user.name, normalizedUsername),
      });
      if (registeredUser?.email) {
        return { email: registeredUser.email, source: 'database' };
      }

      // 2. Check our cached developer emails table (scraping happens during
      //    profile generation only, not on page view).
      const cachedEmail = await db.query.developerEmails.findFirst({
        where: eq(developerEmails.username, normalizedUsername),
      });
      if (cachedEmail?.email) {
        return { email: cachedEmail.email, source: 'cache' };
      }

      return { email: null as string | null, source: 'not_found' };
    }),
});
