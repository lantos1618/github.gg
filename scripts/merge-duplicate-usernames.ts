#!/usr/bin/env bun
/**
 * Migration script to merge duplicate usernames and normalize to lowercase
 * This handles the case where "LANTOS1618" and "lantos1618" exist as separate records
 */

import { db } from '../src/db';
import { developerRankings, developerProfileCache, developerEmails, arenaBattles, userScoreHistory } from '../src/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { config } from 'dotenv';

config({ path: '.env.prod' });

async function main() {
  console.log('🔄 Starting duplicate username merge and normalization...\n');

  try {
    // Step 1: Find all case-insensitive duplicates in developer_rankings
    console.log('🔍 Finding duplicate usernames in developer_rankings...');
    const duplicates: any = await db.execute(sql`
      SELECT LOWER(username) as normalized_username, array_agg(username) as usernames, COUNT(*) as count
      FROM developer_rankings
      GROUP BY LOWER(username)
      HAVING COUNT(*) > 1
    `);

    const duplicateRows = Array.isArray(duplicates) ? duplicates : [];

    if (duplicateRows.length === 0) {
      console.log('✅ No duplicates found! Proceeding with normalization...\n');
    } else {
      console.log(`⚠️  Found ${duplicateRows.length} duplicate username(s):\n`);
      duplicateRows.forEach((row: any) => {
        console.log(`  - ${row.normalized_username}: ${row.usernames.join(', ')}`);
      });
      console.log('');

      // Step 2: Merge duplicates
      for (const duplicate of duplicateRows) {
        const normalizedUsername = duplicate.normalized_username;
        const usernames = duplicate.usernames;

        console.log(`📝 Merging duplicate entries for: ${normalizedUsername}`);

        // Get all ranking entries for this username
        const rankings = await db.execute(sql`
          SELECT * FROM developer_rankings
          WHERE LOWER(username) = ${normalizedUsername}
          ORDER BY total_battles DESC, elo_rating DESC
        `);

        const rankingRows = Array.isArray(rankings) ? rankings : [];

        if (rankingRows.length === 0) continue;

        // Keep the entry with the most battles (or highest ELO if tied)
        const keepEntry = rankingRows[0];
        const deleteEntries = rankingRows.slice(1);

        console.log(`  ✓ Keeping: ${keepEntry.username} (${keepEntry.total_battles} battles, ${keepEntry.elo_rating} ELO)`);

        // Merge stats from other entries
        let totalWins = keepEntry.wins;
        let totalLosses = keepEntry.losses;
        let totalBattles = keepEntry.total_battles;

        for (const entry of deleteEntries) {
          console.log(`  ✓ Merging from: ${entry.username} (${entry.total_battles} battles, ${entry.elo_rating} ELO)`);
          totalWins += entry.wins;
          totalLosses += entry.losses;
          totalBattles += entry.total_battles;

          // Update battles that reference the duplicate username
          await db.execute(sql`
            UPDATE arena_battles
            SET challenger_username = ${normalizedUsername}
            WHERE challenger_username = ${entry.username}
          `);

          await db.execute(sql`
            UPDATE arena_battles
            SET opponent_username = ${normalizedUsername}
            WHERE opponent_username = ${entry.username}
          `);

          // Delete the duplicate entry
          await db.execute(sql`
            DELETE FROM developer_rankings
            WHERE username = ${entry.username}
          `);
        }

        // Update the kept entry with merged stats and normalized username
        await db.execute(sql`
          UPDATE developer_rankings
          SET username = ${normalizedUsername},
              wins = ${totalWins},
              losses = ${totalLosses},
              total_battles = ${totalBattles}
          WHERE username = ${keepEntry.username}
        `);

        console.log(`  ✅ Merged into: ${normalizedUsername} (${totalBattles} total battles)\n`);
      }
    }

    // Step 3: Handle developer_profile_cache duplicates
    console.log('🔍 Handling developer_profile_cache duplicates...');
    const profileDuplicates: any = await db.execute(sql`
      SELECT LOWER(username) as normalized_username, array_agg(username) as usernames, COUNT(*) as count
      FROM developer_profile_cache
      GROUP BY LOWER(username), version
      HAVING COUNT(*) > 1
    `);

    const profileDuplicateRows = Array.isArray(profileDuplicates) ? profileDuplicates : [];

    if (profileDuplicateRows.length > 0) {
      console.log(`⚠️  Found ${profileDuplicateRows.length} duplicate profile(s)\n`);

      for (const duplicate of profileDuplicateRows) {
        const normalizedUsername = duplicate.normalized_username;

        // Keep the lowercase version if it exists, otherwise keep the first one
        const profiles = await db.execute(sql`
          SELECT * FROM developer_profile_cache
          WHERE LOWER(username) = ${normalizedUsername}
          ORDER BY username ASC
        `);

        const profileRows = Array.isArray(profiles) ? profiles : [];
        if (profileRows.length === 0) continue;

        const keepProfile = profileRows.find((p: any) => p.username === normalizedUsername) || profileRows[0];
        const deleteProfiles = profileRows.filter((p: any) => p.id !== keepProfile.id);

        for (const profile of deleteProfiles) {
          await db.execute(sql`
            DELETE FROM developer_profile_cache
            WHERE id = ${profile.id}
          `);
        }

        console.log(`  ✅ Cleaned up duplicates for: ${normalizedUsername}`);
      }
    }

    // Step 4: Normalize all remaining usernames to lowercase
    console.log('\n📝 Normalizing all usernames to lowercase...\n');

    // developer_rankings
    const rankingsResult = await db.execute(sql`
      UPDATE developer_rankings
      SET username = LOWER(username)
      WHERE username != LOWER(username)
    `);
    console.log(`✅ Updated ${rankingsResult.rowCount || 0} rows in developer_rankings`);

    // developer_profile_cache
    const cacheResult = await db.execute(sql`
      UPDATE developer_profile_cache
      SET username = LOWER(username)
      WHERE username != LOWER(username)
    `);
    console.log(`✅ Updated ${cacheResult.rowCount || 0} rows in developer_profile_cache`);

    // developer_emails
    const emailsResult = await db.execute(sql`
      UPDATE developer_emails
      SET username = LOWER(username)
      WHERE username != LOWER(username)
    `);
    console.log(`✅ Updated ${emailsResult.rowCount || 0} rows in developer_emails`);

    // arena_battles (challenger)
    const challengerResult = await db.execute(sql`
      UPDATE arena_battles
      SET challenger_username = LOWER(challenger_username)
      WHERE challenger_username != LOWER(challenger_username)
    `);
    console.log(`✅ Updated ${challengerResult.rowCount || 0} rows (challenger) in arena_battles`);

    // arena_battles (opponent)
    const opponentResult = await db.execute(sql`
      UPDATE arena_battles
      SET opponent_username = LOWER(opponent_username)
      WHERE opponent_username != LOWER(opponent_username)
    `);
    console.log(`✅ Updated ${opponentResult.rowCount || 0} rows (opponent) in arena_battles`);

    // user_score_history
    const historyResult = await db.execute(sql`
      UPDATE user_score_history
      SET username = LOWER(username)
      WHERE username != LOWER(username)
    `);
    console.log(`✅ Updated ${historyResult.rowCount || 0} rows in user_score_history`);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
