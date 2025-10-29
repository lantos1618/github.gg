'use server';

import { createCaller } from '@/lib/trpc/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function incrementViewCount({
  owner,
  repo,
  slug,
  version,
}: {
  owner: string;
  repo: string;
  slug: string;
  version?: number;
}) {
  try {
    // Get current user if logged in
    let userId: string | undefined;
    let username: string | undefined;

    try {
      const headersList = await headers();
      const session = await auth.api.getSession({ headers: headersList } as Request);
      if (session?.user) {
        userId = session.user.id;

        // Get GitHub username from user table (cached during OAuth)
        const userRecord = await db.query.user.findFirst({
          where: eq(user.id, session.user.id),
          columns: {
            githubUsername: true,
          },
        });

        username = userRecord?.githubUsername ?? undefined;
      }
    } catch {
      // User not logged in, continue without tracking
    }

    const caller = await createCaller();
    await caller.wiki.incrementViewCount({
      owner,
      repo,
      slug,
      version,
      userId,
      username,
    });
  } catch (error) {
    console.error('Failed to increment view count:', error);
    // Don't throw - view counting is non-critical
  }
}
