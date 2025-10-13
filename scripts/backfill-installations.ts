#!/usr/bin/env bun
/**
 * Backfill script to populate github_app_installations and installation_repositories
 * from existing account installation_ids
 */

import { db } from '../src/db';
import { account, githubAppInstallations, installationRepositories } from '../src/db/schema';
import { getInstallationOctokit } from '../src/lib/github/app';
import { eq } from 'drizzle-orm';

async function backfillInstallations() {
  console.log('🚀 Starting installation backfill...\n');

  // Get all unique installation IDs from accounts
  const accounts = await db.query.account.findMany({
    where: (account, { isNotNull }) => isNotNull(account.installationId),
  });

  const uniqueInstallationIds = [...new Set(accounts.map(a => a.installationId).filter(Boolean))];

  console.log(`Found ${uniqueInstallationIds.length} unique installations to backfill\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const installationId of uniqueInstallationIds) {
    if (!installationId) continue;

    try {
      console.log(`Processing installation ${installationId}...`);

      // Get octokit instance for this installation
      const octokit = await getInstallationOctokit(installationId);

      // Fetch installation details
      const { data: installation } = await octokit.request('GET /app/installations/{installation_id}', {
        installation_id: installationId,
      });

      // Check if installation already exists
      const existing = await db.query.githubAppInstallations.findFirst({
        where: eq(githubAppInstallations.installationId, installationId),
      });

      if (!existing) {
        // Insert installation record
        const account = installation.account;
        const accountType = account && 'type' in account ? account.type : 'User';
        const accountLogin = account && 'login' in account ? account.login : account && 'slug' in account ? account.slug : 'unknown';

        await db.insert(githubAppInstallations).values({
          installationId: installation.id,
          accountId: account?.id || 0,
          accountType,
          accountLogin,
          accountAvatarUrl: account?.avatar_url,
          accountName: accountLogin,
          repositorySelection: installation.repository_selection,
        });
        console.log(`  ✓ Created installation record`);
      } else {
        console.log(`  → Installation record already exists`);
      }

      // Fetch repositories for this installation
      const { data: repos } = await octokit.request('GET /installation/repositories', {
        per_page: 100,
      });

      // Insert repository records
      let repoCount = 0;
      for (const repo of repos.repositories) {
        const existingRepo = await db.query.installationRepositories.findFirst({
          where: (installationRepositories, { and, eq }) => and(
            eq(installationRepositories.installationId, installationId),
            eq(installationRepositories.repositoryId, repo.id)
          ),
        });

        if (!existingRepo) {
          await db.insert(installationRepositories).values({
            installationId,
            repositoryId: repo.id,
            fullName: repo.full_name,
          });
          repoCount++;
        }
      }

      console.log(`  ✓ Added ${repoCount} repositories (${repos.repositories.length} total)`);
      successCount++;

    } catch (error) {
      console.error(`  ✗ Error processing installation ${installationId}:`, error);
      errorCount++;
    }
  }

  console.log('\n✨ Backfill complete!');
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
}

// Run the backfill
backfillInstallations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
