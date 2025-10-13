#!/usr/bin/env bun

import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { db } from '@/db';
import { user, prAnalysisCache, issueAnalysisCache } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Mock user ID for testing
const TEST_USER_ID = 'test-user-id';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_REPO_OWNER = 'testowner';
const TEST_REPO_NAME = 'testrepo';

// Set up test user
beforeAll(async () => {
  // Create test user if it doesn't exist
  const existingUser = await db.select().from(user).where(eq(user.id, TEST_USER_ID));
  if (existingUser.length === 0) {
    try {
      await db.insert(user).values({
        id: TEST_USER_ID,
        name: 'Test User',
        email: TEST_USER_EMAIL,
        emailVerified: false,
      });
    } catch (error) {
      // If user with this email already exists, check if it's our test user
      const userByEmail = await db.select().from(user).where(eq(user.email, TEST_USER_EMAIL));
      if (userByEmail.length > 0 && userByEmail[0].id !== TEST_USER_ID) {
        // Different user with same email, use a different test email
        await db.insert(user).values({
          id: TEST_USER_ID,
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          emailVerified: false,
        });
      }
    }
  }
});

// Clean up test user after all tests
afterAll(async () => {
  await db.delete(user).where(eq(user.id, TEST_USER_ID));
});

describe('PR Analysis Caching', () => {
  // Clean up test data before and after tests
  beforeAll(async () => {
    await db.delete(prAnalysisCache).where(
      and(
        eq(prAnalysisCache.userId, TEST_USER_ID),
        eq(prAnalysisCache.repoOwner, TEST_REPO_OWNER),
        eq(prAnalysisCache.repoName, TEST_REPO_NAME)
      )
    );
  });

  afterAll(async () => {
    await db.delete(prAnalysisCache).where(
      and(
        eq(prAnalysisCache.userId, TEST_USER_ID),
        eq(prAnalysisCache.repoOwner, TEST_REPO_OWNER),
        eq(prAnalysisCache.repoName, TEST_REPO_NAME)
      )
    );
  });

  test('should create a PR analysis cache entry with version 1', async () => {
    const mockAnalysis = {
      overallScore: 85,
      summary: 'Great PR with solid code quality',
      codeQuality: {
        score: 90,
        issues: [],
        strengths: ['Clear code', 'Good testing'],
      },
      security: {
        score: 80,
        concerns: [],
        recommendations: [],
      },
      performance: {
        score: 85,
        concerns: [],
        suggestions: [],
      },
      maintainability: {
        score: 88,
        issues: [],
        suggestions: [],
      },
      recommendations: ['Add more tests'],
      emoji: '🚀',
    };

    const mockPrSnapshot = {
      prTitle: 'Test PR',
      prDescription: 'Test description',
      baseBranch: 'main',
      headBranch: 'feature',
      changedFiles: 5,
      additions: 100,
      deletions: 20,
    };

    const result = await db.insert(prAnalysisCache).values({
      userId: TEST_USER_ID,
      repoOwner: TEST_REPO_OWNER,
      repoName: TEST_REPO_NAME,
      prNumber: 1,
      version: 1,
      overallScore: mockAnalysis.overallScore,
      analysis: mockAnalysis,
      markdown: '# Test Analysis',
      prSnapshot: mockPrSnapshot,
    }).returning();

    expect(result).toHaveLength(1);
    expect(result[0].version).toBe(1);
    expect(result[0].overallScore).toBe(85);
    expect(result[0].analysis).toEqual(mockAnalysis);
  });

  test('should retrieve cached PR analysis', async () => {
    const cached = await db
      .select()
      .from(prAnalysisCache)
      .where(
        and(
          eq(prAnalysisCache.userId, TEST_USER_ID),
          eq(prAnalysisCache.repoOwner, TEST_REPO_OWNER),
          eq(prAnalysisCache.repoName, TEST_REPO_NAME),
          eq(prAnalysisCache.prNumber, 1)
        )
      )
      .orderBy(prAnalysisCache.version)
      .limit(1);

    expect(cached).toHaveLength(1);
    expect(cached[0].version).toBe(1);
    expect(cached[0].overallScore).toBe(85);
  });

  test('should create version 2 when analyzing same PR again', async () => {
    const mockAnalysisV2 = {
      overallScore: 90,
      summary: 'Improved PR after feedback',
      codeQuality: {
        score: 95,
        issues: [],
        strengths: ['Clear code', 'Good testing', 'Better documentation'],
      },
      security: {
        score: 85,
        concerns: [],
        recommendations: [],
      },
      performance: {
        score: 90,
        concerns: [],
        suggestions: [],
      },
      maintainability: {
        score: 92,
        issues: [],
        suggestions: [],
      },
      recommendations: ['Keep up the good work'],
      emoji: '🚀',
    };

    const result = await db.insert(prAnalysisCache).values({
      userId: TEST_USER_ID,
      repoOwner: TEST_REPO_OWNER,
      repoName: TEST_REPO_NAME,
      prNumber: 1,
      version: 2,
      overallScore: mockAnalysisV2.overallScore,
      analysis: mockAnalysisV2,
      markdown: '# Test Analysis V2',
      prSnapshot: {
        prTitle: 'Test PR',
        prDescription: 'Updated description',
        baseBranch: 'main',
        headBranch: 'feature',
        changedFiles: 6,
        additions: 120,
        deletions: 25,
      },
    }).returning();

    expect(result).toHaveLength(1);
    expect(result[0].version).toBe(2);
    expect(result[0].overallScore).toBe(90);
  });

  test('should retrieve latest version of PR analysis', async () => {
    const cached = await db
      .select()
      .from(prAnalysisCache)
      .where(
        and(
          eq(prAnalysisCache.userId, TEST_USER_ID),
          eq(prAnalysisCache.repoOwner, TEST_REPO_OWNER),
          eq(prAnalysisCache.repoName, TEST_REPO_NAME),
          eq(prAnalysisCache.prNumber, 1)
        )
      )
      .orderBy(desc(prAnalysisCache.version))
      .limit(1);

    expect(cached).toHaveLength(1);
    expect(cached[0].version).toBe(2);
    expect(cached[0].overallScore).toBe(90);
  });

  test('should have all versions in history', async () => {
    const allVersions = await db
      .select()
      .from(prAnalysisCache)
      .where(
        and(
          eq(prAnalysisCache.userId, TEST_USER_ID),
          eq(prAnalysisCache.repoOwner, TEST_REPO_OWNER),
          eq(prAnalysisCache.repoName, TEST_REPO_NAME),
          eq(prAnalysisCache.prNumber, 1)
        )
      );

    expect(allVersions).toHaveLength(2);
    expect(allVersions.some(v => v.version === 1)).toBe(true);
    expect(allVersions.some(v => v.version === 2)).toBe(true);
  });
});

describe('Issue Analysis Caching', () => {
  beforeAll(async () => {
    await db.delete(issueAnalysisCache).where(
      and(
        eq(issueAnalysisCache.userId, TEST_USER_ID),
        eq(issueAnalysisCache.repoOwner, TEST_REPO_OWNER),
        eq(issueAnalysisCache.repoName, TEST_REPO_NAME)
      )
    );
  });

  afterAll(async () => {
    await db.delete(issueAnalysisCache).where(
      and(
        eq(issueAnalysisCache.userId, TEST_USER_ID),
        eq(issueAnalysisCache.repoOwner, TEST_REPO_OWNER),
        eq(issueAnalysisCache.repoName, TEST_REPO_NAME)
      )
    );
  });

  test('should create an Issue analysis cache entry with version 1', async () => {
    const mockAnalysis = {
      overallScore: 75,
      slopRanking: 25,
      summary: 'Well-written issue with clear details',
      clarity: {
        score: 85,
        issues: [],
        strengths: ['Clear description', 'Good formatting'],
      },
      actionability: {
        score: 80,
        isReproducible: true,
        hasStepsToReproduce: true,
        hasExpectedBehavior: true,
        suggestions: [],
      },
      completeness: {
        score: 75,
        missingInfo: ['Environment details'],
        providedInfo: ['Steps to reproduce', 'Expected behavior'],
      },
      aiGeneratedLikelihood: {
        score: 15,
        indicators: [],
      },
      suggestedLabels: ['bug', 'needs-investigation'],
      suggestedPriority: 'medium' as const,
      duplicateLikelihood: {
        score: 20,
        reasoning: 'Seems unique',
      },
      howToImprove: [],
      emoji: '✅',
    };

    const mockIssueSnapshot = {
      issueTitle: 'Test Issue',
      issueBody: 'Test body',
      author: { login: 'testuser', type: 'User' },
      labels: ['bug'],
      state: 'open',
      comments: 2,
    };

    const result = await db.insert(issueAnalysisCache).values({
      userId: TEST_USER_ID,
      repoOwner: TEST_REPO_OWNER,
      repoName: TEST_REPO_NAME,
      issueNumber: 1,
      version: 1,
      overallScore: mockAnalysis.overallScore,
      slopRanking: mockAnalysis.slopRanking,
      suggestedPriority: mockAnalysis.suggestedPriority,
      analysis: mockAnalysis,
      markdown: '# Test Issue Analysis',
      issueSnapshot: mockIssueSnapshot,
    }).returning();

    expect(result).toHaveLength(1);
    expect(result[0].version).toBe(1);
    expect(result[0].overallScore).toBe(75);
    expect(result[0].slopRanking).toBe(25);
    expect(result[0].suggestedPriority).toBe('medium');
  });

  test('should retrieve cached Issue analysis', async () => {
    const cached = await db
      .select()
      .from(issueAnalysisCache)
      .where(
        and(
          eq(issueAnalysisCache.userId, TEST_USER_ID),
          eq(issueAnalysisCache.repoOwner, TEST_REPO_OWNER),
          eq(issueAnalysisCache.repoName, TEST_REPO_NAME),
          eq(issueAnalysisCache.issueNumber, 1)
        )
      )
      .orderBy(issueAnalysisCache.version)
      .limit(1);

    expect(cached).toHaveLength(1);
    expect(cached[0].version).toBe(1);
    expect(cached[0].slopRanking).toBe(25);
  });

  test('should create version 2 when analyzing same Issue again', async () => {
    const mockAnalysisV2 = {
      overallScore: 85,
      slopRanking: 15,
      summary: 'Improved issue with additional details',
      clarity: {
        score: 90,
        issues: [],
        strengths: ['Clear description', 'Good formatting', 'Added context'],
      },
      actionability: {
        score: 85,
        isReproducible: true,
        hasStepsToReproduce: true,
        hasExpectedBehavior: true,
        suggestions: [],
      },
      completeness: {
        score: 90,
        missingInfo: [],
        providedInfo: ['Steps to reproduce', 'Expected behavior', 'Environment details'],
      },
      aiGeneratedLikelihood: {
        score: 10,
        indicators: [],
      },
      suggestedLabels: ['bug', 'high-priority'],
      suggestedPriority: 'high' as const,
      duplicateLikelihood: {
        score: 15,
        reasoning: 'Definitely unique',
      },
      howToImprove: [],
      emoji: '🚀',
    };

    const result = await db.insert(issueAnalysisCache).values({
      userId: TEST_USER_ID,
      repoOwner: TEST_REPO_OWNER,
      repoName: TEST_REPO_NAME,
      issueNumber: 1,
      version: 2,
      overallScore: mockAnalysisV2.overallScore,
      slopRanking: mockAnalysisV2.slopRanking,
      suggestedPriority: mockAnalysisV2.suggestedPriority,
      analysis: mockAnalysisV2,
      markdown: '# Test Issue Analysis V2',
      issueSnapshot: {
        issueTitle: 'Test Issue',
        issueBody: 'Updated body with more details',
        author: { login: 'testuser', type: 'User' },
        labels: ['bug', 'high-priority'],
        state: 'open',
        comments: 5,
      },
    }).returning();

    expect(result).toHaveLength(1);
    expect(result[0].version).toBe(2);
    expect(result[0].overallScore).toBe(85);
    expect(result[0].slopRanking).toBe(15);
  });

  test('should retrieve latest version of Issue analysis', async () => {
    const cached = await db
      .select()
      .from(issueAnalysisCache)
      .where(
        and(
          eq(issueAnalysisCache.userId, TEST_USER_ID),
          eq(issueAnalysisCache.repoOwner, TEST_REPO_OWNER),
          eq(issueAnalysisCache.repoName, TEST_REPO_NAME),
          eq(issueAnalysisCache.issueNumber, 1)
        )
      )
      .orderBy(desc(issueAnalysisCache.version))
      .limit(1);

    expect(cached).toHaveLength(1);
    expect(cached[0].version).toBe(2);
    expect(cached[0].slopRanking).toBe(15);
  });

  test('should isolate cache entries by user', async () => {
    const user1Analysis = await db
      .select()
      .from(issueAnalysisCache)
      .where(eq(issueAnalysisCache.userId, TEST_USER_ID));

    const user2Analysis = await db
      .select()
      .from(issueAnalysisCache)
      .where(eq(issueAnalysisCache.userId, 'different-user-id'));

    expect(user1Analysis.length).toBeGreaterThan(0);
    expect(user2Analysis.length).toBe(0);
  });

  test('should isolate cache entries by repository', async () => {
    const repo1Analysis = await db
      .select()
      .from(issueAnalysisCache)
      .where(
        and(
          eq(issueAnalysisCache.repoOwner, TEST_REPO_OWNER),
          eq(issueAnalysisCache.repoName, TEST_REPO_NAME)
        )
      );

    const repo2Analysis = await db
      .select()
      .from(issueAnalysisCache)
      .where(
        and(
          eq(issueAnalysisCache.repoOwner, 'other-owner'),
          eq(issueAnalysisCache.repoName, 'other-repo')
        )
      );

    expect(repo1Analysis.length).toBeGreaterThan(0);
    expect(repo2Analysis.length).toBe(0);
  });
});

