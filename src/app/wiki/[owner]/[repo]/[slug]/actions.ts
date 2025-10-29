'use server';

import { createCaller } from '@/lib/trpc/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

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

        // Get GitHub username from account
        const userAccount = await db.query.account.findFirst({
          where: and(
            eq(account.userId, session.user.id),
            eq(account.providerId, 'github')
          ),
        });

        if (userAccount?.accessToken) {
          const { Octokit } = await import('@octokit/rest');
          const octokit = new Octokit({ auth: userAccount.accessToken });
          const { data: authenticatedUser } = await octokit.rest.users.getAuthenticated();
          username = authenticatedUser.login.toLowerCase();
        }
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
