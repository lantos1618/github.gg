/**
 * Stargazer Perk Utility
 *
 * Consolidated logic for checking if a user qualifies for the free stargazer perk.
 * Users who star lantos1618/github.gg get 1 free usage per month for certain features.
 */

import { db } from '@/db';
import { tokenUsage } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { getCachedStargazerStatus, setCachedStargazerStatus } from '@/lib/rate-limit';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import type { BetterAuthSession } from '@/lib/github/types';

/** The repository that grants the stargazer perk */
export const STARGAZER_REPO = 'lantos1618/github.gg';
export const STARGAZER_OWNER = 'lantos1618';
export const STARGAZER_REPO_NAME = 'github.gg';

/** Features that support the stargazer perk with their monthly free usage limit */
export const STARGAZER_PERK_FEATURES = {
  profile: 1,
  wiki_generation: 1,
  pr_analysis: 1,
  issue_analysis: 1,
} as const;

export type StargazerPerkFeature = keyof typeof STARGAZER_PERK_FEATURES;

export interface StargazerPerkResult {
  /** Whether the user qualifies for the perk (starred + has remaining free uses) */
  isStargazerPerk: boolean;
  /** The effective plan to use ('pro' if perk applies, otherwise original plan) */
  effectivePlan: string;
  /** Whether the user has starred the repo */
  hasStarred: boolean;
  /** Number of free uses remaining this month (0 if none) */
  remainingFreeUses: number;
  /** Error message to show user if they don't qualify */
  errorMessage?: string;
}

/**
 * Check if user qualifies for the stargazer perk for a specific feature.
 *
 * @param userId - The user's ID
 * @param session - The user's auth session (for GitHub API calls)
 * @param feature - The feature being accessed
 * @param currentPlan - The user's current plan (returned as effectivePlan if perk doesn't apply)
 *
 * @example
 * ```typescript
 * const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
 *
 * if (!subscription || subscription.status !== 'active') {
 *   const perkResult = await checkStargazerPerk(ctx.user.id, ctx.session, 'profile', plan);
 *
 *   if (!perkResult.isStargazerPerk) {
 *     yield { type: 'error', message: perkResult.errorMessage };
 *     return;
 *   }
 *
 *   effectivePlan = perkResult.effectivePlan;
 *   isStargazerPerk = true;
 * }
 * ```
 */
export async function checkStargazerPerk(
  userId: string,
  session: BetterAuthSession,
  feature: StargazerPerkFeature,
  currentPlan: string
): Promise<StargazerPerkResult> {
  const freeUsageLimit = STARGAZER_PERK_FEATURES[feature];

  try {
    // Check cached stargazer status first to reduce GitHub API calls
    let hasStarred = await getCachedStargazerStatus(userId, STARGAZER_REPO);

    // If not cached, fetch from GitHub and cache
    if (hasStarred === null) {
      const githubService = await createGitHubServiceForUserOperations(session);
      hasStarred = await githubService.hasStarredRepo(STARGAZER_OWNER, STARGAZER_REPO_NAME);
      // Cache the result for 1 hour
      await setCachedStargazerStatus(userId, STARGAZER_REPO, hasStarred);
    }

    if (!hasStarred) {
      return {
        isStargazerPerk: false,
        effectivePlan: currentPlan,
        hasStarred: false,
        remainingFreeUses: 0,
        errorMessage: `Active subscription required. Tip: Star our repo (${STARGAZER_REPO}) to get ${freeUsageLimit} free ${feature.replace('_', ' ')}/month!`,
      };
    }

    // Check monthly usage for this feature
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const monthlyUsage = await db
      .select()
      .from(tokenUsage)
      .where(
        and(
          eq(tokenUsage.userId, userId),
          eq(tokenUsage.feature, feature),
          gte(tokenUsage.createdAt, oneMonthAgo)
        )
      );

    const usageCount = monthlyUsage.length;
    const remainingFreeUses = Math.max(0, freeUsageLimit - usageCount);

    if (remainingFreeUses > 0) {
      return {
        isStargazerPerk: true,
        effectivePlan: 'pro',
        hasStarred: true,
        remainingFreeUses,
      };
    }

    return {
      isStargazerPerk: false,
      effectivePlan: currentPlan,
      hasStarred: true,
      remainingFreeUses: 0,
      errorMessage: `You have used your ${freeUsageLimit} free monthly ${feature.replace('_', ' ')}. Upgrade to Pro for unlimited access!`,
    };
  } catch (e) {
    console.error('Failed to check stargazer status:', e);
    return {
      isStargazerPerk: false,
      effectivePlan: currentPlan,
      hasStarred: false,
      remainingFreeUses: 0,
      errorMessage: 'Active subscription required for AI features',
    };
  }
}

/**
 * Simple check if user has starred the repo (cached).
 * Use this when you don't need the full perk check.
 */
export async function hasStarredRepo(
  userId: string,
  session: BetterAuthSession
): Promise<boolean> {
  let hasStarred = await getCachedStargazerStatus(userId, STARGAZER_REPO);

  if (hasStarred === null) {
    const githubService = await createGitHubServiceForUserOperations(session);
    hasStarred = await githubService.hasStarredRepo(STARGAZER_OWNER, STARGAZER_REPO_NAME);
    await setCachedStargazerStatus(userId, STARGAZER_REPO, hasStarred);
  }

  return hasStarred;
}
