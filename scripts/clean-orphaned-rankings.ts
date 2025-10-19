/**
 * Clean up orphaned developer rankings
 *
 * This script removes developer_rankings entries where:
 * 1. The userId is null (dummy users)
 * 2. The username is a display name instead of a GitHub username
 *
 * Specifically targets cases where battles used display names like "Lantos"
 * instead of actual GitHub usernames like "lantos1618"
 */

import { db } from '@/db';
import { developerRankings, account } from '@/db/schema';
import { eq, isNull, and, sql } from 'drizzle-orm';

async function cleanOrphanedRankings() {
  console.log('🧹 Starting cleanup of orphaned developer rankings...\n');

  // Step 1: Get all rankings with null userId (dummy users)
  const dummyRankings = await db
    .select()
    .from(developerRankings)
    .where(isNull(developerRankings.userId));

  console.log(`Found ${dummyRankings.length} rankings with null userId (dummy users)`);

  if (dummyRankings.length === 0) {
    console.log('✅ No orphaned rankings found. Database is clean!');
    return;
  }

  // Step 2: Get all valid GitHub usernames from accounts
  const validAccounts = await db
    .select({ accountId: account.accountId })
    .from(account)
    .where(eq(account.providerId, 'github'));

  const validUsernames = new Set(validAccounts.map(a => a.accountId.toLowerCase()));
  console.log(`Found ${validUsernames.size} valid GitHub accounts\n`);

  // Step 3: Identify orphaned rankings (dummy users with invalid usernames)
  const orphanedRankings = dummyRankings.filter(ranking => {
    // Check if username matches any valid GitHub username (case-insensitive)
    const isValid = validUsernames.has(ranking.username.toLowerCase());
    return !isValid;
  });

  if (orphanedRankings.length === 0) {
    console.log('✅ All dummy rankings have valid GitHub usernames. No cleanup needed!');
    return;
  }

  console.log(`\n❌ Found ${orphanedRankings.length} orphaned rankings to delete:\n`);
  orphanedRankings.forEach(ranking => {
    console.log(`  - ${ranking.username} (ELO: ${ranking.eloRating}, Battles: ${ranking.totalBattles})`);
  });

  // Step 4: Delete orphaned rankings
  console.log('\n🗑️  Deleting orphaned rankings...');

  for (const ranking of orphanedRankings) {
    await db
      .delete(developerRankings)
      .where(
        and(
          eq(developerRankings.username, ranking.username),
          isNull(developerRankings.userId)
        )
      );
    console.log(`  ✓ Deleted: ${ranking.username}`);
  }

  console.log(`\n✅ Successfully cleaned up ${orphanedRankings.length} orphaned rankings!`);
}

// Run the cleanup
cleanOrphanedRankings()
  .then(() => {
    console.log('\n🎉 Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
