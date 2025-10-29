import type { BetterAuthSession } from '@/lib/github/types';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { getOrGenerateProfile } from './profile-manager';
import { getBattleById, updateBattleResults, updateBattleStatus, logTokenUsage } from './repository';
import { sendBattleResultsToParticipants } from './notifications';
import { analyzeBattle, calculateEloChange, determineTier } from '@/lib/ai/battle-analysis';
import { getOrCreateRanking, updateRankings } from './battle-helpers';
import { ALL_BATTLE_CRITERIA } from '@/lib/constants/arena';
import type { BattleCriteria } from '@/lib/types/arena';

export async function executeBattleAsync(
  battleId: string,
  userId: string,
  session: BetterAuthSession | null,
  plan: 'byok' | 'pro'
) {
  try {
    const battle = await getBattleById(battleId);
    if (!battle) throw new Error('Battle not found');

    const githubService = await createGitHubServiceForUserOperations(session);

    // Generate or retrieve profiles for both participants
    const [challengerProfile, opponentProfile] = await Promise.all([
      getOrGenerateProfile(battle.challengerUsername, githubService, userId),
      getOrGenerateProfile(battle.opponentUsername, githubService, userId),
    ]);

    // Analyze the battle
    const battleAnalysis = await analyzeBattle(
      challengerProfile,
      opponentProfile,
      battle.challengerUsername,
      battle.opponentUsername,
      (battle.criteria as BattleCriteria[]) || ALL_BATTLE_CRITERIA
    );

    // Get or create rankings for both participants
    const [challengerRanking, opponentRanking] = await Promise.all([
      getOrCreateRanking(battle.challengerId, battle.challengerUsername),
      getOrCreateRanking(battle.opponentId, battle.opponentUsername)
    ]);

    // Calculate ELO changes
    const challengerWon = battleAnalysis.result.winner === battle.challengerUsername;
    const eloChanges = calculateEloChange(
      challengerRanking.eloRating,
      opponentRanking.eloRating,
      challengerWon
    );

    // Update battle results in database
    await updateBattleResults(
      battle,
      battleAnalysis.result,
      {
        challenger: {
          before: challengerRanking.eloRating,
          after: eloChanges.challenger.newRating,
          change: eloChanges.challenger.change,
        },
        opponent: {
          before: opponentRanking.eloRating,
          after: eloChanges.opponent.newRating,
          change: eloChanges.opponent.change,
        },
      },
      challengerWon
    );

    // Update user rankings
    const challengerTier = determineTier(eloChanges.challenger.newRating);
    const opponentTier = determineTier(eloChanges.opponent.newRating);

    await updateRankings(
      challengerRanking,
      opponentRanking,
      challengerWon,
      eloChanges,
      challengerTier,
      opponentTier
    );

    // Log token usage
    await logTokenUsage(
      userId,
      battle.challengerUsername,
      battleAnalysis.usage,
      plan === 'byok'
    );

    // Send email notifications
    await sendBattleResultsToParticipants(
      battle.challengerUsername,
      battle.opponentUsername,
      challengerWon,
      battleAnalysis.result,
      eloChanges
    );
  } catch (error) {
    console.error('Async battle execution failed:', error);

    await updateBattleStatus(battleId, 'failed', new Date());
  }
}
