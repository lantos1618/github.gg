import { db } from '@/db';
import { installationFreeReviews } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export const FREE_REVIEWS_PER_INSTALLATION = 3;

export interface FreeTierStatus {
  used: number;
  remaining: number;
  total: number;
}

export async function getFreeTierStatus(installationId: number): Promise<FreeTierStatus> {
  const row = await db.query.installationFreeReviews.findFirst({
    where: eq(installationFreeReviews.installationId, installationId),
  });
  const used = row?.used ?? 0;
  return {
    used,
    remaining: Math.max(0, FREE_REVIEWS_PER_INSTALLATION - used),
    total: FREE_REVIEWS_PER_INSTALLATION,
  };
}

export async function incrementFreeReviewsUsed(installationId: number): Promise<FreeTierStatus> {
  await db
    .insert(installationFreeReviews)
    .values({ installationId, used: 1 })
    .onConflictDoUpdate({
      target: installationFreeReviews.installationId,
      set: { used: sql`${installationFreeReviews.used} + 1`, updatedAt: new Date() },
    });
  return getFreeTierStatus(installationId);
}

export function getPlatformApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return key && key.length > 0 ? key : null;
}

export function freeTierFooter(remaining: number, ref: string): string {
  if (remaining <= 0) {
    return [
      '',
      '---',
      `_You've used all ${FREE_REVIEWS_PER_INSTALLATION} free reviews on this installation._`,
      `**[Upgrade to Pro for unlimited reviews → github.gg/pricing?ref=${ref}](https://github.gg/pricing?ref=${ref})**`,
    ].join('\n');
  }
  return [
    '',
    '---',
    `_${FREE_REVIEWS_PER_INSTALLATION - remaining}/${FREE_REVIEWS_PER_INSTALLATION} free reviews used on this installation._`,
    `[Upgrade to Pro for unlimited reviews →](https://github.gg/pricing?ref=${ref})`,
  ].join('\n');
}
