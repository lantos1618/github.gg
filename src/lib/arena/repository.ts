import { db } from '@/db';
import { arenaBattles, developerRankings, tokenUsage } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export async function validateBattle(battleId: string, userId: string) {
  const battle = await db
    .select()
    .from(arenaBattles)
    .where(
      and(
        eq(arenaBattles.id, battleId),
        eq(arenaBattles.challengerId, userId),
        eq(arenaBattles.status, 'pending')
      )
    )
    .limit(1);

  if (battle.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Battle not found or already completed'
    });
  }

  return battle[0];
}

export async function getBattleById(battleId: string) {
  const battle = await db
    .select()
    .from(arenaBattles)
    .where(eq(arenaBattles.id, battleId))
    .limit(1);

  return battle[0] || null;
}

export async function updateBattleStatus(battleId: string, status: string, completedAt?: Date) {
  await db
    .update(arenaBattles)
    .set({
      status,
      ...(completedAt && { completedAt }),
    })
    .where(eq(arenaBattles.id, battleId));
}

export async function updateBattleResults(
  battle: typeof arenaBattles.$inferSelect,
  battleAnalysis: {
    winner: string;
    reason: string;
    challengerScore: { total: number; breakdown: Record<string, number> };
    opponentScore: { total: number; breakdown: Record<string, number> };
    highlights: string[];
    recommendations: string[];
  },
  eloChanges: {
    challenger: { before: number; after: number; change: number };
    opponent: { before: number; after: number; change: number };
  },
  challengerWon: boolean
) {
  const winnerId = challengerWon ? battle.challengerId : battle.opponentId;

  const updatedBattle = await db
    .update(arenaBattles)
    .set({
      status: 'completed',
      winnerId,
      scores: {
        challenger: battleAnalysis.challengerScore,
        opponent: battleAnalysis.opponentScore,
      },
      aiAnalysis: {
        winner: battleAnalysis.winner,
        reason: battleAnalysis.reason,
        highlights: battleAnalysis.highlights,
        recommendations: battleAnalysis.recommendations,
      },
      eloChange: eloChanges,
      completedAt: new Date(),
    })
    .where(eq(arenaBattles.id, battle.id))
    .returning();

  return updatedBattle[0];
}

export async function logTokenUsage(
  userId: string,
  username: string,
  usage: { inputTokens: number; outputTokens: number; totalTokens: number },
  isByok: boolean
) {
  await db.insert(tokenUsage).values({
    userId,
    feature: 'arena_battle',
    repoOwner: username,
    repoName: null,
    model: 'gemini-3-pro-preview',
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    isByok,
    createdAt: new Date(),
  });
}
