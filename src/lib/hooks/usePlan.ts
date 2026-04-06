import { trpc } from '@/lib/trpc/client';
import { useSessionHint } from '@/lib/session-context';
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
 *
 * Uses the server-provided session hint as initial data to prevent
 * flash of "Upgrade" while the tRPC query loads.
 */
export function usePlan() {
  const hint = useSessionHint();

  const { data: currentPlan, isLoading } = trpc.user.getCurrentPlan.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Use server hint immediately, live tRPC data when available
  const plan = (currentPlan?.plan ?? hint?.plan ?? undefined) as Plan | undefined;
  const effectiveLoading = isLoading && !hint?.plan;

  return {
    plan,
    isLoading: effectiveLoading,
    isPaid: isPaidPlan(plan),
    canCustomize: canCustomizeProfile(plan),
    canRefresh: (isOwnProfile: boolean) => canRefreshProfile(plan, isOwnProfile),
    canGenerate: (isOwnProfile: boolean) => canGenerateProfile(plan, isOwnProfile),
    showUpgrade: shouldShowUpgrade(plan, effectiveLoading),
  };
}
