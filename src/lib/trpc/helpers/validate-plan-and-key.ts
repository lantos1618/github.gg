import { TRPCError } from '@trpc/server';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { checkMonthlyTokenQuota } from '@/lib/ai/monthly-quota';

/**
 * Combined subscription + API-key gate used by every long-running AI
 * subscription (scorecard, ai-slop, security-review, ...).
 *
 * On failure: throws TRPCError with FORBIDDEN — callers should catch this and
 * map it to a user-facing `yield { type: 'error', message }` event when streaming.
 *
 * On success: returns the full triple so callers can record `isByok` against
 * token-usage rows and know which plan tier they're operating under.
 */
export async function validatePlanAndKey(userId: string): Promise<{
  subscription: NonNullable<Awaited<ReturnType<typeof getUserPlanAndKey>>['subscription']>;
  plan: Awaited<ReturnType<typeof getUserPlanAndKey>>['plan'];
  keyInfo: NonNullable<Awaited<ReturnType<typeof getApiKeyForUser>>>;
}> {
  const { subscription, plan } = await getUserPlanAndKey(userId);
  if (!subscription || subscription.status !== 'active') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Active subscription required for AI features',
    });
  }

  const keyInfo = await getApiKeyForUser(userId, plan);
  if (!keyInfo) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: plan === 'byok'
        ? 'Please add or re-enter your Gemini API key in settings to use this feature'
        : 'Gemini service is not configured. Please try again later.',
    });
  }

  const quota = await checkMonthlyTokenQuota({ userId, isByok: keyInfo.isByok });
  if (!quota.allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: quota.message });
  }

  return { subscription, plan, keyInfo };
}
