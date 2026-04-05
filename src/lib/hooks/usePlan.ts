import { trpc } from '@/lib/trpc/client';
import {
  type Plan,
  isPaidPlan,
  canCustomizeProfile,
  canRefreshProfile,
  canGenerateProfile,
  shouldShowUpgrade,
} from '@/lib/utils/permissions';

/**
 * Centralised hook that fetches the current user's plan and exposes
 * pre-computed permission flags so components don't need to duplicate
 * plan-gating logic.
 */
export function usePlan() {
  const { data: currentPlan, isLoading } = trpc.user.getCurrentPlan.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const plan = currentPlan?.plan as Plan | undefined;

  return {
    plan,
    isLoading,
    isPaid: isPaidPlan(plan),
    canCustomize: canCustomizeProfile(plan),
    canRefresh: (isOwnProfile: boolean) => canRefreshProfile(plan, isOwnProfile),
    canGenerate: (isOwnProfile: boolean) => canGenerateProfile(plan, isOwnProfile),
    showUpgrade: shouldShowUpgrade(plan, isLoading),
  };
}
