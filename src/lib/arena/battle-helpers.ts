import { db } from '@/db';
import { developerRankings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateDeveloperProfile } from '@/lib/ai/developer-profile';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import type { RepoSummary } from '@/lib/github';
import type { DeveloperProfile } from '@/lib/types/profile';
import { INITIAL_ELO_RATING } from '@/lib/constants/arena';
import { getTierFromElo } from '@/lib/ai/battle-analysis';

export interface DeveloperData {
  username: string;
  repos: RepoSummary[];
  profile: DeveloperProfile;
  profileUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Fetch and analyze a developer for battle
 */
export async function fetchDeveloperData(
  username: string,
  githubSession: any,
  userId: string
): Promise<DeveloperData> {
  const githubService = await createGitHubServiceForUserOperations(githubSession);
  
  console.log(`🏆 Battle: Fetching repositories for ${username}`);
  const repos = await githubService.getUserRepositories(username);
  console.log(`✅ ${username} repos found: ${repos.length}`);
  
  // Log top repositories being used for analysis
  const topRepos = repos
    .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0))
    .slice(0, 10);
  console.log(`📊 Top ${username} repos for analysis:`, topRepos.map(r => `${r.owner}/${r.name} (${r.stargazersCount}⭐)`));
  
  // Generate profile
  console.log(`🧠 Generating profile for ${username}`);
  const profileResult = await generateDeveloperProfile(
    username,
    repos,
    undefined,
    userId
  );

  return {
    username,
    repos,
    profile: profileResult.profile,
    profileUsage: profileResult.usage,
  };
}

/**
 * Get or create developer ranking
 */
export async function getOrCreateRanking(userId: string, username: string) {
  const existing = await db
    .select()
    .from(developerRankings)
    .where(eq(developerRankings.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create initial ranking
  const newRanking = await db
    .insert(developerRankings)
    .values({
      userId,
      username,
      eloRating: INITIAL_ELO_RATING,
      tier: getTierFromElo(INITIAL_ELO_RATING),
    })
    .returning();

  return newRanking[0];
}

/**
 * Update developer ranking after battle
 */
export async function updateRanking(
  userId: string,
  currentRanking: any,
  eloChange: number,
  won: boolean
) {
  const newElo = currentRanking.eloRating + eloChange;
  
  return await db
    .update(developerRankings)
    .set({
      eloRating: newElo,
      wins: currentRanking.wins + (won ? 1 : 0),
      losses: currentRanking.losses + (won ? 0 : 1),
      totalBattles: currentRanking.totalBattles + 1,
      winStreak: won ? currentRanking.winStreak + 1 : 0,
      bestWinStreak: won 
        ? Math.max(currentRanking.bestWinStreak, currentRanking.winStreak + 1)
        : currentRanking.bestWinStreak,
      tier: getTierFromElo(newElo),
      lastBattleAt: new Date(),
    })
    .where(eq(developerRankings.userId, userId));
}

/**
 * Calculate total token usage from multiple sources
 */
export function calculateTotalTokenUsage(
  battleUsage: { promptTokens: number; completionTokens: number; totalTokens: number },
  challengerUsage: { promptTokens: number; completionTokens: number; totalTokens: number },
  opponentUsage: { promptTokens: number; completionTokens: number; totalTokens: number }
) {
  return {
    promptTokens: battleUsage.promptTokens + challengerUsage.promptTokens + opponentUsage.promptTokens,
    completionTokens: battleUsage.completionTokens + challengerUsage.completionTokens + opponentUsage.completionTokens,
    totalTokens: battleUsage.totalTokens + challengerUsage.totalTokens + opponentUsage.totalTokens,
  };
} 