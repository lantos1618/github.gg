/**
 * Backfill developer profile embeddings for rows where embedding IS NULL.
 *
 * After deploying the auto-embed write path in src/lib/trpc/routes/profile/generate.ts,
 * every NEW profile gets an embedding inline. This script populates embeddings
 * for the historical rows so the semantic developer map (powered by
 * scripts/compute-umap-projection.ts) has data to project.
 *
 * Two-step deploy: run this script first, THEN re-run `bun umap:compute` so
 * the freshly-embedded rows get projection_x/projection_y coords.
 *
 * Run with:
 *   bun --env-file=.env.local scripts/backfill-profile-embeddings.ts --dry-run
 *   bun --env-file=.env.local scripts/backfill-profile-embeddings.ts
 *   bun --env-file=.env.local scripts/backfill-profile-embeddings.ts --limit 50
 */

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
// Default cap of 500 protects against OOM on a fresh prod table with many rows
// — re-run the script until it reports 0 to drain. Override with `--limit N`.
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : 500;

import { db } from '../src/db';
import { developerProfileCache } from '../src/db/schema';
import { isNull, and, isNotNull, sql } from 'drizzle-orm';
import { generateProfileEmbedding } from '../src/lib/ai/embeddings';
import type { DeveloperProfile } from '../src/lib/types/profile';

async function main() {
  console.log(`[backfill-profiles] mode=${DRY_RUN ? 'DRY_RUN' : 'WRITE'} limit=${LIMIT}`);

  const rows = await db
    .select({
      id: developerProfileCache.id,
      username: developerProfileCache.username,
      version: developerProfileCache.version,
      profileData: developerProfileCache.profileData,
    })
    .from(developerProfileCache)
    .where(
      and(
        isNull(developerProfileCache.embedding),
        isNotNull(developerProfileCache.profileData)
      )
    )
    .limit(LIMIT);
  console.log(`[backfill-profiles] ${rows.length} rows to embed (cap=${LIMIT})`);

  let succeeded = 0;
  let failed = 0;
  let i = 0;

  for (const row of rows) {
    i++;
    const tag = `${row.username}@v${row.version}`;
    try {
      const profile = row.profileData as DeveloperProfile;
      const embedding = await generateProfileEmbedding(profile);

      if (!DRY_RUN) {
        await db.execute(sql`
          UPDATE developer_profile_cache
          SET embedding = ${'[' + embedding.join(',') + ']'}::vector
          WHERE id = ${row.id}
        `);
      }

      succeeded++;
      if (i % 10 === 0 || i === rows.length) {
        console.log(`[backfill-profiles] ${i}/${rows.length}  ✓ ${tag}`);
      }
    } catch (err) {
      failed++;
      console.error(`[backfill-profiles] ✗ ${tag}: ${err instanceof Error ? err.message : err}`);
    }

    // Gentle pacing — Gemini embeddings have a per-minute quota.
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`[backfill-profiles] done. succeeded=${succeeded} failed=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[backfill-profiles] fatal:', err);
  process.exit(1);
});
