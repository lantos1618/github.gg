#!/usr/bin/env bun
/**
 * Migration script to normalize all usernames to lowercase
 * This fixes the case-sensitivity issue where "lantos1618" and "LANTOS1618" are treated as different users
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  console.log('🔄 Starting username normalization migration...');

  try {
    // Update developer_rankings table
    console.log('📝 Normalizing usernames in developer_rankings...');
    const rankingsResult = await db.execute(sql`
      UPDATE developer_rankings
      SET username = LOWER(username)
      WHERE username != LOWER(username)
    `);
    console.log(`✅ Updated ${rankingsResult.rowCount} rows in developer_rankings`);

    // Update developer_profile_cache table
    console.log('📝 Normalizing usernames in developer_profile_cache...');
    const cacheResult = await db.execute(sql`
      UPDATE developer_profile_cache
      SET username = LOWER(username)
      WHERE username != LOWER(username)
    `);
    console.log(`✅ Updated ${cacheResult.rowCount} rows in developer_profile_cache`);

    // Update developer_emails table
    console.log('📝 Normalizing usernames in developer_emails...');
    const emailsResult = await db.execute(sql`
      UPDATE developer_emails
      SET username = LOWER(username)
      WHERE username != LOWER(username)
    `);
    console.log(`✅ Updated ${emailsResult.rowCount} rows in developer_emails`);

    // Update arena_battles table (challenger_username)
    console.log('📝 Normalizing challenger_username in arena_battles...');
    const challengerResult = await db.execute(sql`
      UPDATE arena_battles
      SET challenger_username = LOWER(challenger_username)
      WHERE challenger_username != LOWER(challenger_username)
    `);
    console.log(`✅ Updated ${challengerResult.rowCount} rows (challenger) in arena_battles`);

    // Update arena_battles table (opponent_username)
    console.log('📝 Normalizing opponent_username in arena_battles...');
    const opponentResult = await db.execute(sql`
      UPDATE arena_battles
      SET opponent_username = LOWER(opponent_username)
      WHERE opponent_username != LOWER(opponent_username)
    `);
    console.log(`✅ Updated ${opponentResult.rowCount} rows (opponent) in arena_battles`);

    // Update user_score_history table
    console.log('📝 Normalizing usernames in user_score_history...');
    const historyResult = await db.execute(sql`
      UPDATE user_score_history
      SET username = LOWER(username)
      WHERE username != LOWER(username)
    `);
    console.log(`✅ Updated ${historyResult.rowCount} rows in user_score_history`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - developer_rankings: ${rankingsResult.rowCount} rows updated`);
    console.log(`  - developer_profile_cache: ${cacheResult.rowCount} rows updated`);
    console.log(`  - developer_emails: ${emailsResult.rowCount} rows updated`);
    console.log(`  - arena_battles (challenger): ${challengerResult.rowCount} rows updated`);
    console.log(`  - arena_battles (opponent): ${opponentResult.rowCount} rows updated`);
    console.log(`  - user_score_history: ${historyResult.rowCount} rows updated`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
