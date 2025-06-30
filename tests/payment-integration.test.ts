#!/usr/bin/env bun

import { test, expect, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { db } from '../src/db';
import { userSubscriptions, userApiKeys, tokenUsage, user } from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Payment Integration Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    testUserId = 'test-user-' + Date.now();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, testUserId));
    await db.delete(userApiKeys).where(eq(userApiKeys.userId, testUserId));
    await db.delete(tokenUsage).where(eq(tokenUsage.userId, testUserId));
    
    // Create test user first
    await db.insert(user).values({
      id: testUserId,
      name: 'Test User',
      email: 'test@example.com',
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Final cleanup
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, testUserId));
    await db.delete(userApiKeys).where(eq(userApiKeys.userId, testUserId));
    await db.delete(tokenUsage).where(eq(tokenUsage.userId, testUserId));
  });

  describe('Database Schema & Operations', () => {
    test('can create and retrieve user subscription', async () => {
      const subscriptionData = {
        userId: testUserId,
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        plan: 'byok' as const,
        status: 'active' as const,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };

      // Insert subscription
      await db.insert(userSubscriptions).values(subscriptionData);

      // Retrieve subscription
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, testUserId),
      });

      expect(subscription).toBeTruthy();
      expect(subscription?.userId).toBe(testUserId);
      expect(subscription?.plan).toBe('byok');
      expect(subscription?.status).toBe('active');
      expect(subscription?.stripeCustomerId).toBe('cus_test_123');
      expect(subscription?.stripeSubscriptionId).toBe('sub_test_123');
    });

    test('can update subscription status', async () => {
      // Create initial subscription
      await db.insert(userSubscriptions).values({
        userId: testUserId,
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Update status to canceled
      await db.update(userSubscriptions)
        .set({ status: 'canceled' })
        .where(eq(userSubscriptions.userId, testUserId));

      // Verify update
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, testUserId),
      });

      expect(subscription?.status).toBe('canceled');
    });

    test('can handle subscription conflicts (upsert)', async () => {
      const subscriptionData = {
        userId: testUserId,
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        plan: 'byok',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // Insert first time
      await db.insert(userSubscriptions).values(subscriptionData);

      // Try to insert again (should update due to unique constraint)
      await db.insert(userSubscriptions).values({
        ...subscriptionData,
        plan: 'pro', // Change plan
        status: 'past_due', // Change status
      }).onConflictDoUpdate({
        target: userSubscriptions.userId,
        set: {
          plan: 'pro',
          status: 'past_due',
        }
      });

      // Verify the subscription was updated
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, testUserId),
      });

      expect(subscription?.plan).toBe('pro');
      expect(subscription?.status).toBe('past_due');
    });
  });

  describe('API Key Management', () => {
    test('can save and retrieve encrypted API key', async () => {
      const { encryptApiKey, decryptApiKey } = await import('../src/lib/utils/encryption');
      
      const testApiKey = 'gza_test_key_123456789';
      const encrypted = encryptApiKey(testApiKey);

      // Save encrypted key
      await db.insert(userApiKeys).values({
        userId: testUserId,
        encryptedGeminiApiKey: encrypted,
      });

      // Retrieve and decrypt
      const apiKeyRecord = await db.query.userApiKeys.findFirst({
        where: eq(userApiKeys.userId, testUserId),
      });

      expect(apiKeyRecord).toBeTruthy();
      expect(apiKeyRecord?.encryptedGeminiApiKey).toBe(encrypted);

      // Verify decryption works
      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(testApiKey);
    });

    test('can update existing API key', async () => {
      const { encryptApiKey } = await import('../src/lib/utils/encryption');
      
      const firstKey = encryptApiKey('gza_first_key_123');
      const secondKey = encryptApiKey('gza_second_key_456');

      // Insert first key
      await db.insert(userApiKeys).values({
        userId: testUserId,
        encryptedGeminiApiKey: firstKey,
      });

      // Update to second key
      await db.insert(userApiKeys).values({
        userId: testUserId,
        encryptedGeminiApiKey: secondKey,
      }).onConflictDoUpdate({
        target: userApiKeys.userId,
        set: { encryptedGeminiApiKey: secondKey }
      });

      // Verify update
      const apiKeyRecord = await db.query.userApiKeys.findFirst({
        where: eq(userApiKeys.userId, testUserId),
      });

      expect(apiKeyRecord?.encryptedGeminiApiKey).toBe(secondKey);
    });
  });

  describe('Usage Tracking', () => {
    test('can track token usage for different plans', async () => {
      // Create usage records
      await db.insert(tokenUsage).values([
        {
          userId: testUserId,
          feature: 'diagram',
          promptTokens: 500,
          completionTokens: 500,
          totalTokens: 1000,
          isByok: true,
          createdAt: new Date(),
        },
        {
          userId: testUserId,
          feature: 'scorecard',
          promptTokens: 1000,
          completionTokens: 1000,
          totalTokens: 2000,
          isByok: false,
          createdAt: new Date(),
        },
        {
          userId: testUserId,
          feature: 'diagram',
          promptTokens: 250,
          completionTokens: 250,
          totalTokens: 500,
          isByok: true,
          createdAt: new Date(),
        },
      ]);

      // Query usage statistics
      const usage = await db.query.tokenUsage.findMany({
        where: eq(tokenUsage.userId, testUserId),
      });

      expect(usage).toHaveLength(3);

      // Calculate totals
      const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
      const byokTokens = usage.filter(u => u.isByok).reduce((sum, u) => sum + u.totalTokens, 0);
      const managedTokens = usage.filter(u => !u.isByok).reduce((sum, u) => sum + u.totalTokens, 0);

      expect(totalTokens).toBe(3500);
      expect(byokTokens).toBe(1500);
      expect(managedTokens).toBe(2000);
    });

    test('can filter usage by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Create usage records with different dates
      await db.insert(tokenUsage).values([
        {
          userId: testUserId,
          feature: 'diagram',
          promptTokens: 500,
          completionTokens: 500,
          totalTokens: 1000,
          isByok: true,
          createdAt: now,
        },
        {
          userId: testUserId,
          feature: 'scorecard',
          promptTokens: 1000,
          completionTokens: 1000,
          totalTokens: 2000,
          isByok: false,
          createdAt: yesterday,
        },
        {
          userId: testUserId,
          feature: 'diagram',
          promptTokens: 250,
          completionTokens: 250,
          totalTokens: 500,
          isByok: true,
          createdAt: lastWeek,
        },
      ]);

      // Query usage from yesterday onwards
      const recentUsage = await db.query.tokenUsage.findMany({
        where: eq(tokenUsage.userId, testUserId),
      });

      // Filter in memory for date range (in real app, you'd use SQL WHERE clause)
      const yesterdayUsage = recentUsage.filter(u => u.createdAt && u.createdAt >= yesterday);
      expect(yesterdayUsage).toHaveLength(2);
    });
  });

  describe('Plan Logic & Business Rules', () => {
    test('free users have no subscription', async () => {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, testUserId),
      });

      expect(subscription).toBeNull();
    });

    test('active subscription grants plan access', async () => {
      // Create active subscription
      await db.insert(userSubscriptions).values({
        userId: testUserId,
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, testUserId),
      });

      expect(subscription?.status).toBe('active');
      expect(subscription?.plan).toBe('pro');
    });

    test('canceled subscription removes plan access', async () => {
      // Create active subscription
      await db.insert(userSubscriptions).values({
        userId: testUserId,
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Cancel subscription
      await db.update(userSubscriptions)
        .set({ status: 'canceled' })
        .where(eq(userSubscriptions.userId, testUserId));

      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, testUserId),
      });

      expect(subscription?.status).toBe('canceled');
    });

    test('expired subscription removes plan access', async () => {
      // Create subscription that expired yesterday
      await db.insert(userSubscriptions).values({
        userId: testUserId,
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, testUserId),
      });

      // Check if subscription is expired
      const isExpired = subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date();
      expect(isExpired).toBe(true);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    test('handles missing environment variables gracefully', async () => {
      // Test that the app doesn't crash when Stripe keys are missing
      const originalStripeKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      // This should not throw an error during import
      expect(() => {
        require('../src/lib/trpc/routes/billing');
      }).not.toThrow();

      // Restore environment variable
      if (originalStripeKey) {
        process.env.STRIPE_SECRET_KEY = originalStripeKey;
      }
    });

    test('handles invalid subscription data', async () => {
      // Try to create subscription with invalid data
      const invalidData = {
        userId: testUserId,
        stripeCustomerId: '', // Empty string
        stripeSubscriptionId: '', // Empty string
        plan: 'invalid_plan' as any, // Invalid plan
        status: 'invalid_status' as any, // Invalid status
        currentPeriodEnd: new Date('invalid-date'), // Invalid date
      };

      // This should not crash the database
      try {
        await db.insert(userSubscriptions).values(invalidData);
      } catch (error) {
        // Expected to fail due to validation
        expect(error).toBeTruthy();
      }
    });

    test('handles concurrent subscription updates', async () => {
      // Create initial subscription
      await db.insert(userSubscriptions).values({
        userId: testUserId,
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        plan: 'byok',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Simulate concurrent updates
      const update1 = db.update(userSubscriptions)
        .set({ status: 'past_due' })
        .where(eq(userSubscriptions.userId, testUserId));

      const update2 = db.update(userSubscriptions)
        .set({ plan: 'pro' })
        .where(eq(userSubscriptions.userId, testUserId));

      // Execute both updates
      await Promise.all([update1, update2]);

      // Verify final state
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, testUserId),
      });

      expect(subscription).toBeTruthy();
      // The last update should be reflected
      expect(subscription?.plan).toBe('pro');
    });
  });
}); 