import { db } from '@/db';
import { userSubscriptions, userApiKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decryptApiKey } from './encryption';
import { env } from '@/lib/env';

export async function getUserSubscription(userId: string) {
  return await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId)
  });
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

export async function getApiKeyForUser(userId: string, plan?: 'byok' | 'pro') {
  // If user has BYOK plan or no plan specified, try to get their API key
  if (!plan || plan === 'byok') {
    const userKey = await getUserApiKey(userId);
    if (userKey) {
      return { apiKey: userKey, isByok: true };
    }
  }
  
  // For Pro users without BYOK key, use system key
  if (plan === 'pro') {
    return { apiKey: env.GEMINI_API_KEY, isByok: false };
  }
  
  return null;
}

export async function getUserPlanAndKey(userId: string) {
  const subscription = await getUserSubscription(userId);
  const apiKey = await getUserApiKey(userId);
  
  return {
    subscription,
    apiKey,
    plan: subscription?.status === 'active' ? subscription.plan : 'free' as const,
  };
} 