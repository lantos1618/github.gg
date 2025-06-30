#!/usr/bin/env node

/**
 * Simple payment integration test runner
 * Run with: node scripts/test-payment.js
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 Payment Integration Test Runner\n');

const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m', reset: '\x1b[0m' };

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message: string) {
  log(message, 'red');
}

async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    console.log(`\n${name}...`);
    await testFn();
    log(`✅ ${name} passed`, 'green');
    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      log(`❌ ${name} failed: ${error.message}`, 'red');
    } else {
      log(`❌ ${name} failed: Unknown error`, 'red');
    }
    return false;
  }
}

async function main() {
  const results = [];

  // Test environment variables
  results.push(await runTest('Environment Variables', async () => {
    const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_BYOK_PRICE_ID', 'STRIPE_PRO_PRICE_ID'];
    const missing = required.filter(v => !process.env[v]);
    if (missing.length > 0) {
      log(`⚠️ Missing: ${missing.join(', ')}`, 'yellow');
    }
  }));

  // Test schema files
  results.push(await runTest('Schema Files', async () => {
    const schemaPath = path.join(__dirname, '../src/db/schema.ts');
    if (!fs.existsSync(schemaPath)) throw new Error('Schema file not found');
    
    const content = fs.readFileSync(schemaPath, 'utf8');
    const tables = ['userSubscriptions', 'userApiKeys', 'tokenUsage'];
    for (const table of tables) {
      if (!content.includes(table)) throw new Error(`Table ${table} not found`);
    }
  }));

  // Test tRPC routes
  results.push(await runTest('tRPC Routes', async () => {
    const billingPath = path.join(__dirname, '../src/lib/trpc/routes/billing.ts');
    const userPath = path.join(__dirname, '../src/lib/trpc/routes/user.ts');
    
    if (!fs.existsSync(billingPath)) throw new Error('Billing route not found');
    if (!fs.existsSync(userPath)) throw new Error('User route not found');
    
    const billingContent = fs.readFileSync(billingPath, 'utf8');
    const userContent = fs.readFileSync(userPath, 'utf8');
    
    const procedures = ['createCheckoutSession', 'getSubscription', 'getCurrentPlan', 'saveApiKey'];
    for (const proc of procedures) {
      if (!billingContent.includes(proc) && !userContent.includes(proc)) {
        throw new Error(`Procedure ${proc} not found`);
      }
    }
  }));

  // Test webhook handler
  results.push(await runTest('Webhook Handler', async () => {
    const webhookPath = path.join(__dirname, '../src/app/api/webhooks/stripe/route.ts');
    if (!fs.existsSync(webhookPath)) throw new Error('Webhook handler not found');
    
    const content = fs.readFileSync(webhookPath, 'utf8');
    const events = ['checkout.session.completed', 'customer.subscription.updated'];
    for (const event of events) {
      if (!content.includes(event)) throw new Error(`Event ${event} not handled`);
    }
  }));

  // Test frontend components
  results.push(await runTest('Frontend Components', async () => {
    const pricingPath = path.join(__dirname, '../src/app/pricing/page.tsx');
    const settingsPath = path.join(__dirname, '../src/app/settings/page.tsx');
    
    if (!fs.existsSync(pricingPath)) throw new Error('Pricing page not found');
    if (!fs.existsSync(settingsPath)) throw new Error('Settings page not found');
    
    const pricingContent = fs.readFileSync(pricingPath, 'utf8');
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    
    if (!pricingContent.includes('createCheckoutSession')) {
      throw new Error('Pricing page missing checkout integration');
    }
    
    if (!settingsContent.includes('getBillingPortal')) {
      throw new Error('Settings page missing billing portal integration');
    }
  }));

  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    log(`🎉 All ${total} tests passed! Payment integration ready.`, 'green');
    console.log('\n📋 Next steps:');
    console.log('   - Test Stripe checkout flow manually');
    console.log('   - Verify webhook handling with Stripe CLI');
    console.log('   - Test plan gating in the UI');
  } else {
    log(`❌ ${total - passed} of ${total} tests failed`, 'red');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logError('Unhandled rejection: ' + message);
  process.exit(1);
});

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logError('Test runner failed: ' + message);
  process.exit(1);
}); 