#!/usr/bin/env bun

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { db } from '@/db';
import { userScoreHistory, repoScoreHistory, developerRankings, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateRankings } from '@/lib/arena/battle-helpers';

describe('Score History Tests', () => {
  const testUserId1 = 'test-user-1';
  const testUserId2 = 'test-user-2';
  const testUsername1 = 'testuser1';
  const testUsername2 = 'testuser2';

  beforeEach(async () => {
    await db.delete(userScoreHistory).where(
      eq(userScoreHistory.userId, testUserId1)
    );
    await db.delete(userScoreHistory).where(
      eq(userScoreHistory.userId, testUserId2)
    );
    await db.delete(developerRankings).where(
      eq(developerRankings.userId, testUserId1)
    );
    await db.delete(developerRankings).where(
      eq(developerRankings.userId, testUserId2)
    );
    await db.delete(repoScoreHistory).where(
      eq(repoScoreHistory.repoOwner, 'testowner')
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
    await db.delete(userScoreHistory).where(
      eq(userScoreHistory.userId, testUserId1)
    );
    await db.delete(userScoreHistory).where(
      eq(userScoreHistory.userId, testUserId2)
    );
    await db.delete(developerRankings).where(
      eq(developerRankings.userId, testUserId1)
    );
    await db.delete(developerRankings).where(
      eq(developerRankings.userId, testUserId2)
    );
    await db.delete(repoScoreHistory).where(
      eq(repoScoreHistory.repoOwner, 'testowner')
    );
    await db.delete(user).where(eq(user.id, testUserId1));
    await db.delete(user).where(eq(user.id, testUserId2));
  });

  test('User score history is created after arena battle', async () => {
    await db.insert(developerRankings).values([
      {
        userId: testUserId1,
        username: testUsername1,
        eloRating: 1200,
        tier: 'Bronze',
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        totalBattles: 0,
      },
      {
        userId: testUserId2,
        username: testUsername2,
        eloRating: 1200,
        tier: 'Bronze',
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        totalBattles: 0,
      },
    ]);

    const [challengerRanking] = await db
      .select()
      .from(developerRankings)
      .where(eq(developerRankings.username, testUsername1))
      .limit(1);
    
    const [opponentRanking] = await db
      .select()
      .from(developerRankings)
      .where(eq(developerRankings.username, testUsername2))
      .limit(1);

    await updateRankings(
      challengerRanking,
      opponentRanking,
      true,
      {
        challenger: { change: 16, newRating: 1216 },
        opponent: { change: -16, newRating: 1184 },
      },
      'Bronze',
      'Bronze'
    );

    const history1 = await db
      .select()
      .from(userScoreHistory)
      .where(eq(userScoreHistory.userId, testUserId1));

    const history2 = await db
      .select()
      .from(userScoreHistory)
      .where(eq(userScoreHistory.userId, testUserId2));

    expect(history1.length).toBe(1);
    expect(history2.length).toBe(1);
    expect(history1[0].eloRating).toBe(1216);
    expect(history2[0].eloRating).toBe(1184);
    expect(history1[0].source).toBe('arena_battle');
    expect(history2[0].source).toBe('arena_battle');
  });

  test('User score history tracks metadata correctly', async () => {
    await db.insert(developerRankings).values([
      {
        userId: testUserId1,
        username: testUsername1,
        eloRating: 1200,
        tier: 'Bronze',
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        totalBattles: 0,
      },
      {
        userId: testUserId2,
        username: testUsername2,
        eloRating: 1200,
        tier: 'Bronze',
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        totalBattles: 0,
      },
    ]);

    const [challengerRanking] = await db
      .select()
      .from(developerRankings)
      .where(eq(developerRankings.username, testUsername1))
      .limit(1);
    
    const [opponentRanking] = await db
      .select()
      .from(developerRankings)
      .where(eq(developerRankings.username, testUsername2))
      .limit(1);

    await updateRankings(
      challengerRanking,
      opponentRanking,
      true,
      {
        challenger: { change: 16, newRating: 1216 },
        opponent: { change: -16, newRating: 1184 },
      },
      'Bronze',
      'Bronze'
    );

    const history = await db
      .select()
      .from(userScoreHistory)
      .where(eq(userScoreHistory.userId, testUserId1));

    expect(history[0].metadata).toMatchObject({
      opponentUsername: testUsername2,
      won: true,
      ratingChange: 16,
    });
  });

  test('Repository score history can be inserted', async () => {
    await db.insert(repoScoreHistory).values({
      repoOwner: 'testowner',
      repoName: 'testrepo',
      ref: 'main',
      overallScore: 85,
      metrics: [
        { name: 'Code Quality', score: 8, maxScore: 10, description: 'Good' },
        { name: 'Documentation', score: 7, maxScore: 10, description: 'Fair' },
      ],
    });

    const history = await db
      .select()
      .from(repoScoreHistory)
      .where(
        and(
          eq(repoScoreHistory.repoOwner, 'testowner'),
          eq(repoScoreHistory.repoName, 'testrepo')
        )
      );

    expect(history.length).toBe(1);
    expect(history[0].overallScore).toBe(85);
    expect(history[0].metrics).toBeDefined();
    expect(history[0].metrics?.length).toBe(2);
  });

  test('Multiple score history entries can be created for same user', async () => {
    await db.insert(userScoreHistory).values([
      {
        userId: testUserId1,
        username: testUsername1,
        eloRating: 1200,
        source: 'arena_battle',
        metadata: { battleId: 'battle1' },
      },
      {
        userId: testUserId1,
        username: testUsername1,
        eloRating: 1216,
        source: 'arena_battle',
        metadata: { battleId: 'battle2' },
      },
      {
        userId: testUserId1,
        username: testUsername1,
        eloRating: 1232,
        source: 'arena_battle',
        metadata: { battleId: 'battle3' },
      },
    ]);

    const history = await db
      .select()
      .from(userScoreHistory)
      .where(eq(userScoreHistory.userId, testUserId1));

    expect(history.length).toBe(3);
    expect(history.map((h) => h.eloRating)).toContain(1200);
    expect(history.map((h) => h.eloRating)).toContain(1216);
    expect(history.map((h) => h.eloRating)).toContain(1232);
  });

  test('Repository score history can track multiple versions', async () => {
    await db.insert(repoScoreHistory).values([
      {
        repoOwner: 'testowner',
        repoName: 'testrepo',
        ref: 'main',
        overallScore: 75,
        metrics: [],
      },
      {
        repoOwner: 'testowner',
        repoName: 'testrepo',
        ref: 'main',
        overallScore: 80,
        metrics: [],
      },
      {
        repoOwner: 'testowner',
        repoName: 'testrepo',
        ref: 'main',
        overallScore: 85,
        metrics: [],
      },
    ]);

    const history = await db
      .select()
      .from(repoScoreHistory)
      .where(
        and(
          eq(repoScoreHistory.repoOwner, 'testowner'),
          eq(repoScoreHistory.repoName, 'testrepo')
        )
      );

    expect(history.length).toBe(3);
    const scores = history.map((h) => h.overallScore);
    expect(scores).toContain(75);
    expect(scores).toContain(80);
    expect(scores).toContain(85);
  });
});
