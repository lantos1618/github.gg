'use server';

import { createCaller } from '@/lib/trpc/server';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WikiViewTracking');

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
    // userId/username are now derived server-side from the session in the tRPC handler
    const caller = await createCaller();
    await caller.wiki.incrementViewCount({ owner, repo, slug, version });
  } catch (error) {
    logger.error('Failed to increment view count', error);
    // Don't throw - view counting is non-critical
  }
}
