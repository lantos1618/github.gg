import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { developerRankings, account } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Simple auth check - require a secret key
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await cleanOrphanedRankings();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}

async function cleanOrphanedRankings() {
  const log: string[] = [];
  log.push('🧹 Starting cleanup of orphaned developer rankings...');

  // Step 1: Get all rankings with null userId (dummy users)
  const dummyRankings = await db
    .select()
    .from(developerRankings)
    .where(isNull(developerRankings.userId));

  log.push(`Found ${dummyRankings.length} rankings with null userId (dummy users)`);

  if (dummyRankings.length === 0) {
    log.push('✅ No orphaned rankings found. Database is clean!');
    return { success: true, log, deleted: [] };
  }

  // Step 2: Get all valid GitHub usernames from accounts
  const validAccounts = await db
    .select({ accountId: account.accountId })
    .from(account)
    .where(eq(account.providerId, 'github'));

  const validUsernames = new Set(validAccounts.map(a => a.accountId.toLowerCase()));
  log.push(`Found ${validUsernames.size} valid GitHub accounts`);

  // Step 3: Identify orphaned rankings (dummy users with invalid usernames)
  const orphanedRankings = dummyRankings.filter(ranking => {
    const isValid = validUsernames.has(ranking.username.toLowerCase());
    return !isValid;
  });

  if (orphanedRankings.length === 0) {
    log.push('✅ All dummy rankings have valid GitHub usernames. No cleanup needed!');
    return { success: true, log, deleted: [] };
  }

  log.push(`❌ Found ${orphanedRankings.length} orphaned rankings to delete:`);
  const deletedList = orphanedRankings.map(r => ({
    username: r.username,
    eloRating: r.eloRating,
    totalBattles: r.totalBattles
  }));

  deletedList.forEach(r => {
    log.push(`  - ${r.username} (ELO: ${r.eloRating}, Battles: ${r.totalBattles})`);
  });

  // Step 4: Delete orphaned rankings
  log.push('🗑️  Deleting orphaned rankings...');

  for (const ranking of orphanedRankings) {
    await db
      .delete(developerRankings)
      .where(
        and(
          eq(developerRankings.username, ranking.username),
          isNull(developerRankings.userId)
        )
      );
    log.push(`  ✓ Deleted: ${ranking.username}`);
  }

  log.push(`✅ Successfully cleaned up ${orphanedRankings.length} orphaned rankings!`);

  return {
    success: true,
    log,
    deleted: deletedList,
    count: orphanedRankings.length
  };
}
