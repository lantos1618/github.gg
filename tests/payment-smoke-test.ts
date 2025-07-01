#!/usr/bin/env bun

import { test, expect } from 'bun:test';

/**
 * Quick smoke test for payment integration
 * Run this to verify the core payment components are working
 */

test('Payment Integration Smoke Test', async () => {
  console.log('🧪 Running Payment Integration Smoke Test...\n');

  // Test 1: Environment Variables
  console.log('1. Checking environment variables...');
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 
    'STRIPE_BYOK_PRICE_ID',
    'STRIPE_PRO_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    console.log('   This is expected in test environment, but required for production');
  } else {
    console.log('✅ All Stripe environment variables are set');
  }

  // Test 2: Database Schema
  console.log('\n2. Checking database schema...');
  try {
    const { db } = await import('@/db');
    const { userSubscriptions, userApiKeys, tokenUsage } = await import('@/db/schema');
    
    // Test database connection
    await db.execute('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Test schema tables exist
    const tables = [userSubscriptions, userApiKeys, tokenUsage];
    for (const table of tables) {
      expect(table).toBeDefined();
    }
    console.log('✅ All required tables are defined');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }

  // Test 3: Encryption Utils
  console.log('\n3. Checking encryption utilities...');
  try {
    const { encryptApiKey, decryptApiKey, validateApiKey } = await import('@/lib/utils/encryption');
    
    const testKey = 'gza_test_key_123456789';
    const encrypted = encryptApiKey(testKey);
    const decrypted = decryptApiKey(encrypted);
    
    expect(validateApiKey(testKey)).toBe(true);
    expect(decrypted).toBe(testKey);
    expect(encrypted).not.toBe(testKey); // Should be encrypted
    
    console.log('✅ Encryption utilities working correctly');
  } catch (error) {
    console.error('❌ Encryption test failed:', error);
    throw error;
  }

  // Test 4: tRPC Routes
  console.log('\n4. Checking tRPC routes...');
  try {
    const { billingRouter } = await import('@/lib/trpc/routes/billing');
    const { userRouter } = await import('@/lib/trpc/routes/user');
    
    expect(billingRouter).toBeDefined();
    expect(userRouter).toBeDefined();
    
    // Check that required procedures exist
    expect(billingRouter.createCheckoutSession).toBeDefined();
    expect(billingRouter.getSubscription).toBeDefined();
    expect(userRouter.getCurrentPlan).toBeDefined();
    expect(userRouter.saveApiKey).toBeDefined();
    
    console.log('✅ tRPC routes are properly defined');
  } catch (error) {
    console.error('❌ tRPC routes test failed:', error);
    throw error;
  }

  // Test 5: Webhook Handler
  console.log('\n5. Checking webhook handler...');
  try {
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    expect(POST).toBeDefined();
    console.log('✅ Webhook handler is properly defined');
  } catch (error) {
    console.error('❌ Webhook handler test failed:', error);
    throw error;
  }

  // Test 6: Frontend Components
  console.log('\n6. Checking frontend components...');
  try {
    // Test that pricing page can be imported
    const PricingPage = await import('@/app/pricing/page');
    expect(PricingPage.default).toBeDefined();
    
    // Test that settings page can be imported
    const SettingsPage = await import('@/app/settings/page');
    expect(SettingsPage.default).toBeDefined();
    
    console.log('✅ Frontend components are properly defined');
  } catch (error) {
    console.error('❌ Frontend components test failed:', error);
    throw error;
  }

  // Test 7: Plan Logic
  console.log('\n7. Checking plan logic...');
  try {
    const { getUserPlanAndKey } = await import('@/lib/utils/user-plan');
    expect(getUserPlanAndKey).toBeDefined();
    console.log('✅ Plan logic utilities are properly defined');
  } catch (error) {
    console.error('❌ Plan logic test failed:', error);
    throw error;
  }

  console.log('\n🎉 All payment integration smoke tests passed!');
  console.log('\n📋 Next steps:');
  console.log('   - Run full integration tests: bun test tests/payment-integration.test.ts');
  console.log('   - Test Stripe checkout flow manually');
  console.log('   - Verify webhook handling with Stripe CLI');
  console.log('   - Test plan gating in the UI');
});

test('Quick Database Operations Test', async () => {
  console.log('\n🔍 Testing database operations...');
  
  const { db } = await import('@/db');
  const { userSubscriptions } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  
  const testUserId = 'smoke-test-user-' + Date.now();
  
  try {
    // Test insert
    await db.insert(userSubscriptions).values({
      userId: testUserId,
      stripeCustomerId: 'cus_smoke_test',
      stripeSubscriptionId: 'sub_smoke_test',
      plan: 'byok',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    
    // Test query
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, testUserId),
    });
    
    expect(subscription).toBeTruthy();
    expect(subscription?.plan).toBe('byok');
    
    // Test update
    await db.update(userSubscriptions)
      .set({ status: 'canceled' })
      .where(eq(userSubscriptions.userId, testUserId));
    
    const updatedSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, testUserId),
    });
    
    expect(updatedSubscription?.status).toBe('canceled');
    
    // Cleanup
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, testUserId));
    
    console.log('✅ Database operations working correctly');
  } catch (error) {
    console.error('❌ Database operations test failed:', error);
    throw error;
  }
}); 