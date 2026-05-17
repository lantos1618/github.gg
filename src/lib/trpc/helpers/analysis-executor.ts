import { db } from '@/db';
import { tokenUsage } from '@/db/schema';
import { validatePlanAndKey } from '@/lib/trpc/helpers/validate-plan-and-key';
import { sql, and, type SQL } from 'drizzle-orm';
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core';

// Generic type for the AI generation function result
export interface AIGenerationResult<T> {
  data: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// Options for executing an analysis with versioning
export interface AnalysisExecutionOptions<
  TTable extends PgTable<TableConfig>,
  TData,
  TInsert extends Record<string, unknown> = Record<string, unknown>
> {
  // User ID for auth checks
  userId: string;

  // Feature name for usage tracking (e.g., 'scorecard', 'ai-slop', 'diagram', 'profile')
  feature: string;

  // Repository info for usage tracking
  repoOwner?: string;
  repoName?: string;

  // The table to insert into
  table: TTable;

  // Function that generates the AI analysis
  generateFn: () => Promise<AIGenerationResult<TData>>;

  // Function that constructs the WHERE conditions for versioning
  // Should return the conditions that uniquely identify this analysis group
  versioningConditions: SQL<unknown>[];

  // Function that constructs the values to insert. The helper computes
  // `version` atomically via a sub-SELECT and injects it into the row,
  // so callers should NOT include a `version` field here — anything they
  // set will be overwritten. This eliminates the SELECT-MAX-then-INSERT
  // race window that previously required a retry loop.
  buildInsertValues: (data: TData) => TInsert;
}

/**
 * Generic helper to execute AI analysis with:
 * - Subscription & API key validation
 * - AI generation
 * - **Atomic** versioned database insertion (single statement: `INSERT ...
 *   VALUES (..., (SELECT COALESCE(MAX(version), 0) + 1 FROM table WHERE ...))`)
 * - Token usage logging
 *
 * Eliminates the SELECT-MAX-then-INSERT race that previously could exhaust
 * its 5-attempt retry loop under concurrent inserts for the same
 * (user, repo, ref) group. With the atomic pattern, the version is computed
 * inside the same SQL statement that performs the INSERT, so two concurrent
 * writers can never read the same MAX and collide on the unique index.
 */
export async function executeAnalysisWithVersioning<
  TTable extends PgTable<TableConfig>,
  TData,
  TInsert extends Record<string, unknown> = Record<string, unknown>
>(
  options: AnalysisExecutionOptions<TTable, TData, TInsert>
): Promise<{
  // The returned row includes the atomically-computed `version` plus
  // everything the caller's buildInsertValues produced.
  insertedRecord: TInsert & { version: number };
  usage: AIGenerationResult<TData>['usage'];
  keyInfo: { isByok: boolean };
}> {
  const {
    userId,
    feature,
    repoOwner,
    repoName,
    table,
    generateFn,
    versioningConditions,
    buildInsertValues,
  } = options;

  // 1. Subscription + API-key gate (throws TRPCError on failure)
  const { keyInfo } = await validatePlanAndKey(userId);

  // 2. Generate AI analysis
  const result = await generateFn();

  // 3. Atomic INSERT-SELECT: version is computed inside the statement so
  //    concurrent writers can't read the same MAX.
  const insertValues = buildInsertValues(result.data) as Record<string, unknown>;
  insertValues.version = sql`(SELECT COALESCE(MAX(version), 0) + 1 FROM ${table} WHERE ${and(...versioningConditions)})`;

  // We allow SQL fragments in values; Drizzle's PgInsertValue type permits
  // `SQL` per field. Casting through `Record<string, unknown>` lets us swap
  // the `version` field without fighting the inferred-insert-model type.
  const results = await db
    .insert(table as PgTable<TableConfig>)
    // The atomic statement makes ON CONFLICT effectively unreachable, but we
    // keep it as a belt-and-braces guard in case a future caller relaxes the
    // unique index or someone re-runs an explicit version.
    .values(insertValues as unknown as TTable['$inferInsert'])
    .onConflictDoNothing()
    .returning();

  if (results.length === 0 || !results[0]) {
    throw new Error(`Failed to insert ${feature} analysis (no row returned)`);
  }

  const insertedRecord = results[0] as TInsert & { version: number };

  // 4. Log token usage
  await db.insert(tokenUsage).values({
    userId,
    feature,
    repoOwner: repoOwner || null,
    repoName: repoName || null,
    model: 'gemini-3.1-pro-preview',
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    totalTokens: result.usage.totalTokens,
    isByok: keyInfo.isByok,
    createdAt: new Date(),
  });

  return { insertedRecord, usage: result.usage, keyInfo };
}
