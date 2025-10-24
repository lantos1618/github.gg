import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { tokenUsage } from '@/db/schema';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { isPgErrorWithCode } from '@/lib/db/utils';
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

  // Function that constructs the values to insert
  buildInsertValues: (data: TData, version: number) => TInsert;

  // Maximum retry attempts for version conflicts (default: 5)
  maxRetries?: number;
}

/**
 * Generic helper to execute AI analysis with:
 * - Subscription & API key validation
 * - AI generation
 * - Versioned database insertion with conflict retry
 * - Token usage logging
 */
export async function executeAnalysisWithVersioning<
  TTable extends PgTable<TableConfig>,
  TData,
  TInsert extends Record<string, unknown> = Record<string, unknown>
>(
  options: AnalysisExecutionOptions<TTable, TData, TInsert>
): Promise<{ insertedRecord: TInsert; usage: AIGenerationResult<TData>['usage']; keyInfo: { isByok: boolean } }> {
  const {
    userId,
    feature,
    repoOwner,
    repoName,
    table,
    generateFn,
    versioningConditions,
    buildInsertValues,
    maxRetries = 5,
  } = options;

  // 1. Check for active subscription
  const { subscription, plan } = await getUserPlanAndKey(userId);
  if (!subscription || subscription.status !== 'active') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Active subscription required for AI features',
    });
  }

  // 2. Get appropriate API key
  const keyInfo = await getApiKeyForUser(userId, plan as 'byok' | 'pro');
  if (!keyInfo) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Please add your Gemini API key in settings to use this feature',
    });
  }

  // 3. Generate AI analysis
  const result = await generateFn();

  // 4. Per-group versioning: get max version, insert with version = max + 1, retry on conflict
  let insertedRecord: TInsert | null = null;
  let attempt = 0;

  while (!insertedRecord && attempt < maxRetries) {
    attempt++;

    // Get current max version for this group
    const maxVersionResult = await db
      .select({ max: sql`MAX(version)` })
      .from(table as PgTable<TableConfig>)
      .where(and(...versioningConditions));

    const rawMax = maxVersionResult[0]?.max;
    const maxVersion = typeof rawMax === 'number' ? rawMax : Number(rawMax) || 0;
    const nextVersion = maxVersion + 1;

    try {
      // Try to insert with the next version
      const insertValues = buildInsertValues(result.data, nextVersion);
      // Execute the insert with conflict handling
      const results = await db
        .insert(table as PgTable<TableConfig>)
        .values(insertValues)
        .onConflictDoNothing()
        .returning();

      // The returning() call returns an array of the inserted records
      // TypeScript can't infer this perfectly with our generic setup, but
      // we know at runtime that results[0] matches TInsert structure
      if (results.length > 0 && results[0]) {
        insertedRecord = results[0] as TInsert;
      }
    } catch (e: unknown) {
      // If unique constraint violation, retry
      if (isPgErrorWithCode(e) && e.code === '23505') {
        continue;
      }
      throw e;
    }
  }

  if (!insertedRecord) {
    throw new Error(`Failed to insert ${feature} analysis after ${maxRetries} attempts`);
  }

  // 5. Log token usage
  await db.insert(tokenUsage).values({
    userId,
    feature,
    repoOwner: repoOwner || null,
    repoName: repoName || null,
    model: 'gemini-2.5-pro',
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    totalTokens: result.usage.totalTokens,
    isByok: keyInfo.isByok,
    createdAt: new Date(),
  });

  return { insertedRecord, usage: result.usage, keyInfo };
}
