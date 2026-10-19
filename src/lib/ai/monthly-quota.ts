import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { tokenUsage } from '@/db/schema';

export const PRO_MONTHLY_MANAGED_TOKEN_LIMIT = 5_000_000;

export type ManagedTokenUsageReader = (query: {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
}) => Promise<number>;

type ManagedQuotaBase = {
  limitTokens: number;
  usedTokens: number;
  remainingTokens: number;
  periodStart: Date;
  periodEnd: Date;
};

export type MonthlyQuotaResult =
  | { allowed: true; status: 'unlimited' }
  | ({ allowed: true; status: 'available' } & ManagedQuotaBase)
  | ({
      allowed: false;
      status: 'exhausted';
      code: 'MONTHLY_MANAGED_TOKEN_LIMIT_REACHED';
      message: string;
    } & ManagedQuotaBase);

/**
 * Read a user's recorded managed-AI usage for one half-open UTC month.
 * Postgres SUM(integer) returns bigint, so request text and convert explicitly.
 */
export const readMonthlyManagedTokens: ManagedTokenUsageReader = async ({
  userId,
  periodStart,
  periodEnd,
}) => {
  const { db } = await import('@/db');
  const [row] = await db
    .select({ totalTokens: sql<string>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)::text` })
    .from(tokenUsage)
    .where(and(
      eq(tokenUsage.userId, userId),
      eq(tokenUsage.isByok, false),
      gte(tokenUsage.createdAt, periodStart),
      lt(tokenUsage.createdAt, periodEnd),
    ));

  return Number(row?.totalTokens ?? '0');
};

/**
 * Check the advertised Pro managed-AI allowance before starting a request.
 * BYOK usage is unlimited and never reads the managed usage table.
 * Unexpected database errors propagate so callers cannot silently bypass the cap.
 *
 * This checks completed, recorded usage. In-flight concurrent requests may each
 * start below the limit and exceed it together; a reservation ledger is needed
 * for a strict hard cap.
 */
export async function checkMonthlyTokenQuota(
  {
    userId,
    isByok,
    at = new Date(),
  }: {
    userId: string;
    isByok: boolean;
    at?: Date;
  },
  readUsedTokens: ManagedTokenUsageReader = readMonthlyManagedTokens,
): Promise<MonthlyQuotaResult> {
  if (isByok) return { allowed: true, status: 'unlimited' };
  if (!userId) throw new TypeError('userId is required');
  if (Number.isNaN(at.getTime())) throw new RangeError('at must be a valid Date');

  const periodStart = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
  const usedTokens = await readUsedTokens({ userId, periodStart, periodEnd });
  if (!Number.isSafeInteger(usedTokens) || usedTokens < 0) {
    throw new Error('Invalid managed token usage total');
  }

  const remainingTokens = Math.max(0, PRO_MONTHLY_MANAGED_TOKEN_LIMIT - usedTokens);
  const details = {
    limitTokens: PRO_MONTHLY_MANAGED_TOKEN_LIMIT,
    usedTokens,
    remainingTokens,
    periodStart,
    periodEnd,
  };

  if (remainingTokens === 0) {
    return {
      allowed: false,
      status: 'exhausted',
      code: 'MONTHLY_MANAGED_TOKEN_LIMIT_REACHED',
      message: `Monthly Pro AI token limit reached. Your allowance resets on ${periodEnd.toISOString().slice(0, 10)} UTC.`,
      ...details,
    };
  }

  return { allowed: true, status: 'available', ...details };
}
