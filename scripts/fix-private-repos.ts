#!/usr/bin/env bun
/**
 * After migration 0019, all repos default to is_private=true (hidden).
 * This script checks each repo via GitHub API and marks PUBLIC ones as is_private=false.
 * 
 * Run after migration: bun run scripts/fix-private-repos.ts --env-file=.env.prod
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { Octokit } from '@octokit/rest';

const DATABASE_URL = process.env.DATABASE_URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN is required');
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);
const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function main() {
  console.log('🔍 Fetching unique repos from scorecards (all default to hidden after migration)...\n');

  const repos = await db.execute(sql`
    SELECT DISTINCT repo_owner, repo_name 
    FROM repository_scorecards 
    ORDER BY repo_owner, repo_name
  `);

  console.log(`Found ${repos.length} unique repos to check\n`);

  let publicCount = 0;
  let privateCount = 0;
  let errorCount = 0;

  for (const repo of repos) {
    const owner = repo.repo_owner as string;
    const name = repo.repo_name as string;
    
    try {
      const { data } = await octokit.rest.repos.get({ owner, repo: name });
      
      if (data.private) {
        console.log(`🔒 Private (stays hidden): ${owner}/${name}`);
        privateCount++;
      } else {
        console.log(`✅ Public - unhiding: ${owner}/${name}`);
        await db.execute(sql`
          UPDATE repository_scorecards 
          SET is_private = false 
          WHERE repo_owner = ${owner} AND repo_name = ${name}
        `);
        publicCount++;
      }
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`🔒 Not found/no access (stays hidden): ${owner}/${name}`);
        privateCount++;
      } else {
        console.error(`❌ Error: ${owner}/${name} - ${error.message}`);
        errorCount++;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n--- SUMMARY ---');
  console.log(`✅ Unhidden (public): ${publicCount}`);
  console.log(`🔒 Hidden (private/not found): ${privateCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('\n✅ Done!');
  
  await client.end();
}

main().catch(console.error);
