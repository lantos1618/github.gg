#!/usr/bin/env bun

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { db } from '@/db';
import { arenaBattles, developerRankings, user } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Arena Battle Tests', () => {
  const testUserId1 = 'arena-test-user-1';
  const testUserId2 = 'arena-test-user-2';
  const testUsername1 = 'arenaplayer1';
  const testUsername2 = 'arenaplayer2';

  beforeEach(async () => {
    await db.delete(arenaBattles).where(
      eq(arenaBattles.challengerId, testUserId1)
    );
    await db.delete(developerRankings).where(
      eq(developerRankings.userId, testUserId1)
    );
    await db.delete(developerRankings).where(
      eq(developerRankings.userId, testUserId2)
    );
    await db.delete(user).where(eq(user.id, testUserId1));
    await db.delete(user).where(eq(user.id, testUserId2));

    await db.insert(user).values([
      {
        id: testUserId1,
        name: testUsername1,
        email: `${testUsername1}@test.com`,
      },
      {
        id: testUserId2,
        name: testUsername2,
        email: `${testUsername2}@test.com`,
      },
    ]);
  });

  afterEach(async () => {
    await db.delete(arenaBattles).where(
      eq(arenaBattles.challengerId, testUserId1)
    );
    await db.delete(developerRankings).where(
      eq(developerRankings.userId, testUserId1)
    );
    await db.delete(developerRankings).where(
      eq(developerRankings.userId, testUserId2)
    );
    await db.delete(user).where(eq(user.id, testUserId1));
    await db.delete(user).where(eq(user.id, testUserId2));
  });

  test('Battle can be created with proper schema', async () => {
    const [battle] = await db.insert(arenaBattles).values({
      challengerId: testUserId1,
      opponentId: testUserId2,
      challengerUsername: testUsername1,
      opponentUsername: testUsername2,
      status: 'pending',
      battleType: 'standard',
    }).returning();

    expect(battle).toBeDefined();
    expect(battle.challengerId).toBe(testUserId1);
    expect(battle.opponentId).toBe(testUserId2);
    expect(battle.status).toBe('pending');
  });

  test('Multiple battles can be created between same users', async () => {
    await db.insert(arenaBattles).values([
      {
        challengerId: testUserId1,
        opponentId: testUserId2,
        challengerUsername: testUsername1,
        opponentUsername: testUsername2,
        status: 'completed',
        battleType: 'standard',
      },
      {
        challengerId: testUserId1,
        opponentId: testUserId2,
        challengerUsername: testUsername1,
        opponentUsername: testUsername2,
        status: 'completed',
        battleType: 'standard',
      },
      {
        challengerId: testUserId1,
        opponentId: testUserId2,
        challengerUsername: testUsername1,
        opponentUsername: testUsername2,
        status: 'pending',
        battleType: 'friendly',
      },
    ]);

    const battles = await db
      .select()
      .from(arenaBattles)
      .where(eq(arenaBattles.challengerId, testUserId1));

    expect(battles.length).toBe(3);
  });

  test('Battle can store scores and ELO changes', async () => {
    const [battle] = await db.insert(arenaBattles).values({
      challengerId: testUserId1,
      opponentId: testUserId2,
      challengerUsername: testUsername1,
      opponentUsername: testUsername2,
      winnerId: testUserId1,
      status: 'completed',
      battleType: 'standard',
      scores: {
        challenger: {
          total: 85,
          breakdown: {
            codeQuality: 90,
            documentation: 80,
            testing: 85,
          },
        },
        opponent: {
          total: 75,
          breakdown: {
            codeQuality: 70,
            documentation: 80,
            testing: 75,
          },
        },
      },
      eloChange: {
        challenger: {
          before: 1200,
          after: 1216,
          change: 16,
        },
        opponent: {
          before: 1200,
          after: 1184,
          change: -16,
        },
      },
    }).returning();

    expect(battle.scores).toBeDefined();
    expect(battle.scores?.challenger.total).toBe(85);
    expect(battle.scores?.opponent.total).toBe(75);
    expect(battle.eloChange).toBeDefined();
    expect(battle.eloChange?.challenger.change).toBe(16);
    expect(battle.eloChange?.opponent.change).toBe(-16);
  });

  test('Battle can store AI analysis', async () => {
    const [battle] = await db.insert(arenaBattles).values({
      challengerId: testUserId1,
      opponentId: testUserId2,
      challengerUsername: testUsername1,
      opponentUsername: testUsername2,
      status: 'completed',
      battleType: 'standard',
      aiAnalysis: {
        summary: 'This was a close battle',
        highlights: ['Great code quality', 'Excellent testing'],
        recommendations: ['Improve documentation', 'Add more tests'],
      },
    }).returning();

    expect(battle.aiAnalysis).toBeDefined();
  });

  test('Developer rankings can track win streaks', async () => {
    const [ranking] = await db.insert(developerRankings).values({
      userId: testUserId1,
      username: testUsername1,
      eloRating: 1200,
      tier: 'Bronze',
      wins: 5,
      losses: 2,
      draws: 0,
      totalBattles: 7,
      winStreak: 3,
      bestWinStreak: 5,
    }).returning();

    expect(ranking.winStreak).toBe(3);
    expect(ranking.bestWinStreak).toBe(5);
    expect(ranking.wins).toBe(5);
    expect(ranking.losses).toBe(2);
    expect(ranking.totalBattles).toBe(7);
  });
});
