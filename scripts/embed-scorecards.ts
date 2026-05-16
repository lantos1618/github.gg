/**
 * Backfill scorecard embeddings for rows where embedding IS NULL.
 *
 * After deploying migration 0026_add_scorecard_embeddings.sql, every NEW
 * scorecard gets an embedding on write (see src/lib/trpc/routes/scorecard.ts).
 * This script populates embeddings for the historical rows so semantic search
 * and similar-repos start finding existing scorecards immediately.
 *
 * Run with:
 *   bun --env-file=.env.local scripts/embed-scorecards.ts --dry-run
 *   bun --env-file=.env.local scripts/embed-scorecards.ts
 *   bun --env-file=.env.local scripts/embed-scorecards.ts --limit 50
 */

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
// Default cap of 500 protects against OOM on a fresh prod table with many rows
// — re-run the script until it reports 0 to drain. Override with `--limit N`.
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : 500;

import { db } from '../src/db';
import { repositoryScorecards } from '../src/db/schema';
import { isNull, sql } from 'drizzle-orm';
import { generateScorecardEmbedding } from '../src/lib/ai/embeddings';

async function main() {
  console.log(`[backfill] mode=${DRY_RUN ? 'DRY_RUN' : 'WRITE'} limit=${LIMIT}`);

  const rows = await db
    .select({
      id: repositoryScorecards.id,
      repoOwner: repositoryScorecards.repoOwner,
      repoName: repositoryScorecards.repoName,
      overallScore: repositoryScorecards.overallScore,
      markdown: repositoryScorecards.markdown,
    })
    .from(repositoryScorecards)
    .where(isNull(repositoryScorecards.embedding))
    .limit(LIMIT);
  console.log(`[backfill] ${rows.length} rows to embed (cap=${LIMIT})`);

  let succeeded = 0;
  let failed = 0;
  let i = 0;

  for (const row of rows) {
    i++;
    const tag = `${row.repoOwner}/${row.repoName}`;
    try {
      const embedding = await generateScorecardEmbedding({
        repoOwner: row.repoOwner,
        repoName: row.repoName,
        overallScore: row.overallScore,
        markdown: row.markdown,
      });

      if (!DRY_RUN) {
        await db.execute(sql`
          UPDATE repository_scorecards
          SET embedding = ${'[' + embedding.join(',') + ']'}::vector
          WHERE id = ${row.id}
        `);
      }

      succeeded++;
      if (i % 10 === 0 || i === rows.length) {
        console.log(`[backfill] ${i}/${rows.length}  ✓ ${tag}`);
      }
    } catch (err) {
      failed++;
      console.error(`[backfill] ✗ ${tag}: ${err instanceof Error ? err.message : err}`);
    }

    // Gentle pacing — Gemini embeddings have a per-minute quota.
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`[backfill] done. succeeded=${succeeded} failed=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[backfill] fatal:', err);
  process.exit(1);
});
