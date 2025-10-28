'use server';

import { createCaller } from '@/lib/trpc/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

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
        username = session.user.name;
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
