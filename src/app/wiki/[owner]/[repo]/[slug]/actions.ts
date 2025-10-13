'use server';

import { createCaller } from '@/lib/trpc/server';

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
    const caller = await createCaller();
    await caller.wiki.incrementViewCount({
      owner,
      repo,
      slug,
      version,
    });
  } catch (error) {
    console.error('Failed to increment view count:', error);
    // Don't throw - view counting is non-critical
  }
}
