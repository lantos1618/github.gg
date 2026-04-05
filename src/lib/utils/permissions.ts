/**
 * Centralized plan-gating logic.
 *
 * All feature-access checks that depend on the user's plan should live here
 * so they can be updated in a single place.
 */

export type Plan = 'free' | 'byok' | 'pro';

/** Returns true for any paid plan (pro or byok). */
export function isPaidPlan(plan: Plan | undefined | null): boolean {
  return plan === 'pro' || plan === 'byok';
}

/** Profile customisation (colors, sparkles, etc.) requires a paid plan. */
export function canCustomizeProfile(plan: Plan | undefined | null): boolean {
  return isPaidPlan(plan);
}

/** Refreshing / regenerating an existing profile is allowed for own-profile or paid users. */
export function canRefreshProfile(plan: Plan | undefined | null, isOwnProfile: boolean): boolean {
  return isOwnProfile || isPaidPlan(plan);
}

/** Generating a new profile from scratch is allowed for own-profile or paid users. */
export function canGenerateProfile(plan: Plan | undefined | null, isOwnProfile: boolean): boolean {
  return isOwnProfile || isPaidPlan(plan);
}

/** Whether the "upgrade" nudge should be shown. */
export function shouldShowUpgrade(plan: Plan | undefined | null, isLoading: boolean): boolean {
  return !isLoading && (!plan || plan === 'free');
}
