import { db } from '@/db';
import { userSubscriptions, userApiKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decryptApiKey } from './encryption';
import type { Plan } from './permissions';
import { getPlatformGeminiApiKey } from '@/lib/ai/models';

export async function getUserSubscription(userId: string) {
  return await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId)
  });
}

/** A delayed or missed Stripe webhook must not extend AI entitlement. */
export function isSubscriptionCurrent(subscription: {
  status: string;
  currentPeriodEnd: Date;
} | null | undefined, now = new Date()): boolean {
  return subscription?.status === 'active' &&
    new Date(subscription.currentPeriodEnd).getTime() > now.getTime();
}

export async function getUserApiKey(userId: string) {
  const keyRecord = await db.query.userApiKeys.findFirst({
    where: eq(userApiKeys.userId, userId)
  });
  
  if (!keyRecord) {
    return null;
  }
  
  try {
    return decryptApiKey(keyRecord.encryptedGeminiApiKey);
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return null;
  }
}

export async function getApiKeyForUser(userId: string, plan?: Plan) {
  // If user has BYOK plan or no plan specified, try to get their API key
  if (!plan || plan === 'byok') {
    const userKey = await getUserApiKey(userId);
    if (userKey) {
      return { apiKey: userKey, isByok: true };
    }
  }
  
  // For Pro users without BYOK key, use system key
  if (plan === 'pro') {
    const apiKey = getPlatformGeminiApiKey();
    return apiKey ? { apiKey, isByok: false } : null;
  }
  
  return null;
}

export async function getUserPlanAndKey(userId: string) {
  const storedSubscription = await getUserSubscription(userId);
  const subscription = isSubscriptionCurrent(storedSubscription) ? storedSubscription : null;
  const apiKey = await getUserApiKey(userId);
  
  return {
    subscription,
    apiKey,
    plan: (subscription?.status === 'active' ? subscription.plan : 'free') as Plan,
  };
}
