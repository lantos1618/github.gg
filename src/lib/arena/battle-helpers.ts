import { db } from '@/db';
import { developerRankings } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface DeveloperData {
  username: string;
  profile: {
    summary: string;
    skillAssessment: { name: string; score: number }[];
    developmentStyle: { name: string; score: number }[];
    topRepos: { name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }[];
  };
  repos: { name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }[];
}

interface BattleAnalysisData {
  winner: string;
  reason: string;
  challengerScore: {
    total: number;
    breakdown: Record<string, number>;
  };
  opponentScore: {
    total: number;
    breakdown: Record<string, number>;
  };
  highlights: string[];
  recommendations: string[];
}

export async function fetchDeveloperData(username: string): Promise<DeveloperData> {
  // This is a placeholder implementation
  // In a real implementation, you would fetch from GitHub API
  return {
    username,
    profile: {
      summary: `${username} is a skilled developer with expertise in multiple technologies.`,
      skillAssessment: [
        { name: 'JavaScript', score: 8 },
        { name: 'TypeScript', score: 7 },
        { name: 'React', score: 8 },
        { name: 'Node.js', score: 7 },
        { name: 'Python', score: 6 }
      ],
      developmentStyle: [
        { name: 'Code Quality', score: 8 },
        { name: 'Testing', score: 7 },
        { name: 'Documentation', score: 6 },
        { name: 'Architecture', score: 8 }
      ],
      topRepos: [
        {
          name: 'awesome-project',
          description: 'An amazing project',
          language: 'TypeScript',
          stargazers_count: 100,
          forks_count: 20,
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
    },
    repos: [
      {
        name: 'awesome-project',
        description: 'An amazing project',
        language: 'TypeScript',
        stargazers_count: 100,
        forks_count: 20,
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  };
}

export async function getOrCreateRanking(userId: string, username: string) {
  const existing = await db
    .select()
    .from(developerRankings)
    .where(eq(developerRankings.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newRanking] = await db
    .insert(developerRankings)
    .values({
      userId,
      username,
      eloRating: 1200,
      tier: 'Bronze',
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0,
      totalBattles: 0,
    })
    .returning();

  return newRanking;
}

export async function updateRankings(
  challengerId: string,
  opponentId: string,
  challengerWon: boolean,
  eloChanges: { challenger: { change: number; newRating: number }; opponent: { change: number; newRating: number } },
  challengerTier: string,
  opponentTier: string
) {
  const challengerRanking = await db
    .select()
    .from(developerRankings)
    .where(eq(developerRankings.userId, challengerId))
    .limit(1);

  const opponentRanking = await db
    .select()
    .from(developerRankings)
    .where(eq(developerRankings.userId, opponentId))
    .limit(1);

  if (challengerRanking.length === 0 || opponentRanking.length === 0) {
    throw new Error('Rankings not found');
  }

  const challenger = challengerRanking[0];
  const opponent = opponentRanking[0];

  const challengerUpdates = {
    eloRating: eloChanges.challenger.newRating,
    tier: challengerTier,
    wins: challenger.wins + (challengerWon ? 1 : 0),
    losses: challenger.losses + (challengerWon ? 0 : 1),
    winStreak: challengerWon ? challenger.winStreak + 1 : 0,
    bestWinStreak: challengerWon ? Math.max(challenger.bestWinStreak, challenger.winStreak + 1) : challenger.bestWinStreak,
    totalBattles: challenger.totalBattles + 1,
  };

  const opponentUpdates = {
    eloRating: eloChanges.opponent.newRating,
    tier: opponentTier,
    wins: opponent.wins + (challengerWon ? 0 : 1),
    losses: opponent.losses + (challengerWon ? 1 : 0),
    winStreak: challengerWon ? 0 : opponent.winStreak + 1,
    bestWinStreak: challengerWon ? opponent.bestWinStreak : Math.max(opponent.bestWinStreak, opponent.winStreak + 1),
    totalBattles: opponent.totalBattles + 1,
  };

  await db
    .update(developerRankings)
    .set(challengerUpdates)
    .where(eq(developerRankings.userId, challengerId));

  await db
    .update(developerRankings)
    .set(opponentUpdates)
    .where(eq(developerRankings.userId, opponentId));

  return { challenger: challengerUpdates, opponent: opponentUpdates };
}

export function calculateTokenUsage(analysis: BattleAnalysisData): number {
  // Estimate token usage based on analysis content
  const content = JSON.stringify(analysis);
  return Math.ceil(content.length / 4); // Rough estimate: 1 token ≈ 4 characters
} 