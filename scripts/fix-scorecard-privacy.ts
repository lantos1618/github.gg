/**
 * Migration script to fix incorrectly marked private scorecards.
 *
 * Problem: Profile generation was not setting isPrivate, so it defaulted to true.
 * But profile generation only analyzes public repos (filtered in getUserRepositories).
 *
 * Solution: Check each repo's actual visibility on GitHub and update accordingly.
 *
 * Run with:
 *   npx tsx scripts/fix-scorecard-privacy.ts --dry-run  # Preview changes
 *   npx tsx scripts/fix-scorecard-privacy.ts            # Apply changes
 */

const DRY_RUN = process.argv.includes('--dry-run');

import { db } from '../src/db';
import { repositoryScorecards } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { Octokit } from '@octokit/rest';

const GITHUB_TOKEN = process.env.GITHUB_PUBLIC_API_KEY || process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_PUBLIC_API_KEY or GITHUB_TOKEN environment variable required');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Rate limit handling
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function checkRepoVisibility(owner: string, repo: string): Promise<'public' | 'private' | 'not_found' | 'error'> {
  try {
    const response = await octokit.rest.repos.get({ owner, repo });
    return response.data.private ? 'private' : 'public';
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 404) {
      return 'not_found';
    }
    console.error(`Error checking ${owner}/${repo}:`, error);
    return 'error';
  }
}

async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  console.log('🔍 Finding scorecards marked as private...\n');

  // Get all unique repo combinations marked as private
  const privateScorecardsRaw = await db
    .select({
      id: repositoryScorecards.id,
      repoOwner: repositoryScorecards.repoOwner,
      repoName: repositoryScorecards.repoName,
    })
    .from(repositoryScorecards)
    .where(eq(repositoryScorecards.isPrivate, true));

  // Dedupe by owner/repo to minimize API calls
  const uniqueRepos = new Map<string, { owner: string; repo: string; ids: string[] }>();
  for (const sc of privateScorecardsRaw) {
    const key = `${sc.repoOwner}/${sc.repoName}`;
    if (!uniqueRepos.has(key)) {
      uniqueRepos.set(key, { owner: sc.repoOwner, repo: sc.repoName, ids: [] });
    }
    uniqueRepos.get(key)!.ids.push(sc.id);
  }

  console.log(`📊 Found ${privateScorecardsRaw.length} scorecards marked as private`);
  console.log(`📊 Covering ${uniqueRepos.size} unique repositories\n`);

  const stats = {
    updated: 0,
    alreadyPrivate: 0,
    notFound: 0,
    errors: 0,
  };

  const toUpdate: string[] = [];

  let i = 0;
  for (const [key, { owner, repo, ids }] of uniqueRepos) {
    i++;
    process.stdout.write(`\r[${i}/${uniqueRepos.size}] Checking ${key}...`);

    const visibility = await checkRepoVisibility(owner, repo);

    switch (visibility) {
      case 'public':
        console.log(`\r✅ ${key} is PUBLIC - will update ${ids.length} scorecard(s)`);
        toUpdate.push(...ids);
        stats.updated += ids.length;
        break;
      case 'private':
        console.log(`\r🔒 ${key} is correctly PRIVATE - no change needed`);
        stats.alreadyPrivate += ids.length;
        break;
      case 'not_found':
        console.log(`\r⚠️  ${key} NOT FOUND on GitHub - leaving as private`);
        stats.notFound += ids.length;
        break;
      case 'error':
        console.log(`\r❌ ${key} ERROR checking - leaving as private`);
        stats.errors += ids.length;
        break;
    }

    // Rate limit: GitHub allows 5000 requests/hour for authenticated requests
    // Being conservative with 100ms delay
    await delay(100);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Will update to public: ${stats.updated}`);
  console.log(`   Correctly private: ${stats.alreadyPrivate}`);
  console.log(`   Repo not found: ${stats.notFound}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log('='.repeat(50) + '\n');

  if (toUpdate.length === 0) {
    console.log('✅ No updates needed!');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN: Would update ${toUpdate.length} scorecards to is_private=false`);
    console.log('Run without --dry-run to apply changes.');
    process.exit(0);
  }

  // Confirm before updating
  console.log(`\n⚠️  About to update ${toUpdate.length} scorecards to is_private=false`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  await delay(5000);

  // Update using ANY array
  console.log('📝 Updating scorecards...');

  const { sql } = await import('drizzle-orm');

  await db.execute(
    sql`UPDATE repository_scorecards SET is_private = false WHERE id = ANY(${toUpdate}::uuid[])`
  );

  console.log(`\n✅ Successfully updated ${toUpdate.length} scorecards to is_private=false`);
}

main().catch(console.error);
