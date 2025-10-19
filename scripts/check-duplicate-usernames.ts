#!/usr/bin/env bun
/**
 * Script to check for duplicate usernames in the database
 */

import { db } from '../src/db';
import { developerRankings } from '../src/db/schema';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  console.log('🔍 Checking for duplicate usernames...\n');

  // Check for case-insensitive duplicates in developer_rankings
  const duplicates: any = await db.execute(sql`
    SELECT LOWER(username) as normalized_username, COUNT(*) as count
    FROM developer_rankings
    GROUP BY LOWER(username)
    HAVING COUNT(*) > 1
  `);

  const duplicateRows = Array.isArray(duplicates) ? duplicates : [];

  if (duplicateRows.length === 0) {
    console.log('✅ No duplicate usernames found in developer_rankings!');
  } else {
    console.log(`⚠️  Found ${duplicateRows.length} duplicate usernames:\n`);
    duplicateRows.forEach((row: any) => {
      console.log(`  - ${row.normalized_username}: ${row.count} entries`);
    });
  }

  // Check specific user for LANTOS1618
  console.log('\n🔍 Checking for LANTOS1618 / lantos1618...');
  const lantos: any = await db.execute(sql`
    SELECT username, elo_rating, wins, losses, total_battles
    FROM developer_rankings
    WHERE LOWER(username) = 'lantos1618'
  `);

  const lantosRows = Array.isArray(lantos) ? lantos : [];

  if (lantosRows.length === 0) {
    console.log('  No entries found for lantos1618');
  } else {
    console.log(`  Found ${lantosRows.length} entry/entries:`);
    lantosRows.forEach((row: any) => {
      console.log(`    - Username: ${row.username}, ELO: ${row.elo_rating}, W/L: ${row.wins}/${row.losses}, Battles: ${row.total_battles}`);
    });
  }

  process.exit(0);
}

main();
