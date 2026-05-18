/**
 * Apply pending Drizzle migrations idempotently.
 *
 * Why this exists: `drizzle-kit migrate`'s journal is broken in this repo —
 * it tries to re-apply 0000 (CREATE TABLE without IF NOT EXISTS) which errors,
 * leaving every subsequent migration unapplied. Result: we shipped PR #46
 * (scorecard embeddings, migration 0026) and the column never landed on prod
 * — every scorecard read 500'd for a day until someone hit the surface.
 *
 * This script bypasses drizzle-kit and uses its own `app_migrations` table to
 * track which files have been applied. On first run, it baselines the table
 * with everything *currently in the schema* (so we don't try to re-create
 * pre-existing tables), then on every subsequent run only applies new files.
 *
 * Usage:
 *   bun run scripts/migrate.ts            # apply pending
 *   bun run scripts/migrate.ts --check    # report drift, exit 1 if any
 *   bun run scripts/migrate.ts --baseline # mark everything as applied (first-run on existing DB)
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
const TRACKING_TABLE = 'app_migrations';

const CHECK_ONLY = process.argv.includes('--check');
const BASELINE = process.argv.includes('--baseline');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[migrate] DATABASE_URL not set');
  process.exit(1);
}

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f))
    .sort();
}

async function ensureTrackingTable(sql: postgres.Sql) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      filename text PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT now(),
      checksum text
    )
  `);
}

async function listApplied(sql: postgres.Sql): Promise<Set<string>> {
  const rows = await sql.unsafe(`SELECT filename FROM ${TRACKING_TABLE}`);
  return new Set(rows.map((r) => r.filename as string));
}

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1, idle_timeout: 5 });

  try {
    await ensureTrackingTable(sql);
    const allFiles = listMigrationFiles();
    const applied = await listApplied(sql);
    const pending = allFiles.filter((f) => !applied.has(f));

    console.log(`[migrate] ${allFiles.length} migrations on disk, ${applied.size} applied, ${pending.length} pending`);

    if (BASELINE) {
      console.log('[migrate] --baseline: marking ALL migrations as applied without running them');
      console.log('         (use only on first-run against an existing DB)');
      for (const f of pending) {
        await sql.unsafe(`INSERT INTO ${TRACKING_TABLE} (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [f]);
        console.log(`         baselined: ${f}`);
      }
      console.log(`[migrate] done. ${pending.length} files baselined.`);
      return;
    }

    if (pending.length === 0) {
      console.log('[migrate] up to date.');
      return;
    }

    if (CHECK_ONLY) {
      console.log('[migrate] --check: drift detected:');
      for (const f of pending) console.log(`         pending: ${f}`);
      process.exit(1);
    }

    for (const f of pending) {
      const path = join(MIGRATIONS_DIR, f);
      const body = readFileSync(path, 'utf8');
      console.log(`[migrate] applying: ${f}`);
      try {
        // Use a transaction per migration so partial application doesn't poison the journal.
        await sql.begin(async (tx) => {
          await tx.unsafe(body);
          await tx.unsafe(`INSERT INTO ${TRACKING_TABLE} (filename) VALUES ($1)`, [f]);
        });
        console.log(`          ✓ ${f}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`          ✗ ${f}: ${msg}`);
        process.exit(1);
      }
    }

    console.log(`[migrate] applied ${pending.length} migrations.`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('[migrate] fatal:', err);
  process.exit(1);
});
