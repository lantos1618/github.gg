import { db } from './src/db';
import { tokenUsage, user, userSubscriptions } from './src/db/schema';

async function insertTestData() {
  try {
    console.log('Inserting test data...');

    // Create a test user
    const testUser = await db.insert(user).values({
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    console.log('Created test user:', testUser[0]);

    // Insert some token usage data
    const usageData = await db.insert(tokenUsage).values([
      {
        userId: 'test-user-123',
        feature: 'diagram',
        repoOwner: 'testuser',
        repoName: 'testrepo',
        model: 'gemini-2.5-flash',
        promptTokens: 1000,
        completionTokens: 2000,
        totalTokens: 3000,
        isByok: false,
        createdAt: new Date(),
      },
      {
        userId: 'test-user-123',
        feature: 'scorecard',
        repoOwner: 'testuser',
        repoName: 'testrepo',
        model: 'gemini-2.5-flash',
        promptTokens: 500,
        completionTokens: 1500,
        totalTokens: 2000,
        isByok: true,
        createdAt: new Date(),
      },
    ]).returning();

    console.log('Created token usage records:', usageData.length);

    // Create a test subscription
    const subscription = await db.insert(userSubscriptions).values({
      userId: 'test-user-123',
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: 'sub_test123',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: new Date(),
    }).returning();

    console.log('Created subscription:', subscription[0]);

    console.log('✅ Test data inserted successfully!');
    console.log('Now visit http://localhost:3000/admin to see the data');

  } catch (error) {
    console.error('❌ Error inserting test data:', error);
  } finally {
    process.exit(0);
  }
}

insertTestData(); 