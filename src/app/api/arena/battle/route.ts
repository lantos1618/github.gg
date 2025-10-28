import { NextRequest } from 'next/server';
import { db } from '@/db';
import {
  developerRankings,
  arenaBattles,
  tokenUsage,
  developerProfileCache,
  developerEmails,
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { analyzeBattle, calculateEloChange, determineTier } from '@/lib/ai/battle-analysis';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import type { BetterAuthSession } from '@/lib/github/types';
import { getOrCreateRanking, updateRankings } from '@/lib/arena/battle-helpers';
import { ALL_BATTLE_CRITERIA } from '@/lib/constants/arena';
import { generateDeveloperProfile } from '@/lib/ai/developer-profile';
import type { DeveloperProfile } from '@/lib/types/profile';
import type { BattleCriteria } from '@/lib/types/arena';
import { sendBattleResultsEmail } from '@/lib/email/resend';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

function isProfileStale(updatedAt: Date): boolean {
  return new Date().getTime() - updatedAt.getTime() > 24 * 60 * 60 * 1000;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const battleId = searchParams.get('battleId');

  if (!battleId) {
    return new Response('Missing battleId', { status: 400 });
  }

  // Check authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        sendEvent('progress', { status: 'initializing', progress: 0, message: 'Initializing battle...' });

        // Get battle
        const battle = await db
          .select()
          .from(arenaBattles)
          .where(eq(arenaBattles.id, battleId))
          .limit(1);

        if (!battle[0]) {
          throw new Error('Battle not found');
        }

        // Authorization: Only the challenger can execute their own battle
        if (battle[0].challengerId !== session.user.id) {
          throw new Error('Forbidden: You can only run your own battles');
        }

        // Check plan
        const { plan } = await getUserPlanAndKey(session.user.id);
        const keyInfo = await getApiKeyForUser(session.user.id, plan as 'byok' | 'pro');
        if (!keyInfo) {
          throw new Error('API Key required for this feature.');
        }

        // Mark as in_progress
        await db
          .update(arenaBattles)
          .set({ status: 'in_progress' })
          .where(eq(arenaBattles.id, battleId));

        sendEvent('progress', { status: 'in_progress', progress: 5, message: 'Battle started!' });

        const githubService = await createGitHubServiceForUserOperations(session);

        // Function to get or generate developer profile
        const getOrGenerateProfile = async (username: string, role: 'challenger' | 'opponent'): Promise<DeveloperProfile> => {
          const normalizedUsername = username.toLowerCase();

          sendEvent('progress', {
            status: 'loading_profile',
            progress: role === 'challenger' ? 10 : 30,
            message: `Loading ${role} profile for ${username}...`
          });

          const existing = await db
            .select()
            .from(developerProfileCache)
            .where(eq(developerProfileCache.username, normalizedUsername))
            .limit(1);

          if (existing[0] && !isProfileStale(existing[0].updatedAt)) {
            sendEvent('progress', {
              status: 'profile_cached',
              progress: role === 'challenger' ? 20 : 40,
              message: `Using cached profile for ${username}`
            });
            return existing[0].profileData as DeveloperProfile;
          }

          sendEvent('progress', {
            status: 'fetching_repos',
            progress: role === 'challenger' ? 15 : 35,
            message: `Fetching repositories for ${username}...`
          });

          const repos = await githubService.getUserRepositories(username);
          if (repos.length === 0) throw new Error(`${username} has no public repositories.`);

          sendEvent('progress', {
            status: 'generating_profile',
            progress: role === 'challenger' ? 20 : 40,
            message: `Analyzing ${repos.length} repositories for ${username}...`
          });

          const result = await generateDeveloperProfile({
            username,
            repos,
            userId: session.user.id
          });

          const maxVersionResult = await db
            .select({ max: sql<number>`MAX(version)` })
            .from(developerProfileCache)
            .where(eq(developerProfileCache.username, normalizedUsername));
          const nextVersion = (maxVersionResult[0]?.max || 0) + 1;

          await db.insert(developerProfileCache).values({
            username: normalizedUsername,
            version: nextVersion,
            profileData: result.profile,
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: [developerProfileCache.username, developerProfileCache.version],
            set: { profileData: result.profile, updatedAt: new Date() }
          });

          sendEvent('progress', {
            status: 'profile_generated',
            progress: role === 'challenger' ? 25 : 45,
            message: `Profile generated for ${username}`
          });

          return result.profile;
        };

        // Generate both profiles
        const challengerProfile = await getOrGenerateProfile(battle[0].challengerUsername, 'challenger');
        const opponentProfile = await getOrGenerateProfile(battle[0].opponentUsername, 'opponent');

        sendEvent('progress', {
          status: 'analyzing_battle',
          progress: 50,
          message: 'AI analyzing both profiles...'
        });

        // Analyze battle
        const battleAnalysis = await analyzeBattle(
          challengerProfile,
          opponentProfile,
          battle[0].challengerUsername,
          battle[0].opponentUsername,
          (battle[0].criteria as BattleCriteria[]) || ALL_BATTLE_CRITERIA
        );

        sendEvent('progress', {
          status: 'battle_analyzed',
          progress: 70,
          message: 'Battle analysis complete!'
        });

        // Calculate ELO
        sendEvent('progress', {
          status: 'calculating_elo',
          progress: 75,
          message: 'Calculating ELO ratings...'
        });

        const [challengerRanking, opponentRanking] = await Promise.all([
          getOrCreateRanking(battle[0].challengerId, battle[0].challengerUsername),
          getOrCreateRanking(battle[0].opponentId, battle[0].opponentUsername)
        ]);

        const challengerWon = battleAnalysis.result.winner === battle[0].challengerUsername;
        const challengerCurrentRating = challengerRanking.eloRating;
        const opponentCurrentRating = opponentRanking.eloRating;

        const eloChanges = calculateEloChange(
          challengerCurrentRating,
          opponentCurrentRating,
          challengerWon
        );

        // Update battle results
        sendEvent('progress', {
          status: 'saving_results',
          progress: 85,
          message: 'Saving battle results...'
        });

        const winnerId = challengerWon ? battle[0].challengerId : battle[0].opponentId;

        await db
          .update(arenaBattles)
          .set({
            status: 'completed',
            winnerId,
            scores: {
              challenger: battleAnalysis.result.challengerScore,
              opponent: battleAnalysis.result.opponentScore,
            },
            aiAnalysis: {
              winner: battleAnalysis.result.winner,
              reason: battleAnalysis.result.reason,
              highlights: battleAnalysis.result.highlights,
              recommendations: battleAnalysis.result.recommendations,
            },
            eloChange: {
              challenger: {
                before: challengerCurrentRating,
                after: eloChanges.challenger.newRating,
                change: eloChanges.challenger.change,
              },
              opponent: {
                before: opponentCurrentRating,
                after: eloChanges.opponent.newRating,
                change: eloChanges.opponent.change,
              },
            },
            completedAt: new Date(),
          })
          .where(eq(arenaBattles.id, battle[0].id));

        // Update rankings
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
        await db.insert(tokenUsage).values({
          userId: session.user.id,
          feature: 'arena_battle',
          repoOwner: battle[0].challengerUsername,
          repoName: null,
          model: 'gemini-2.5-pro',
          inputTokens: battleAnalysis.usage.inputTokens,
          outputTokens: battleAnalysis.usage.outputTokens,
          totalTokens: battleAnalysis.usage.totalTokens,
          isByok: plan === 'byok',
          createdAt: new Date(),
        });

        // Send emails (non-blocking)
        sendEvent('progress', {
          status: 'sending_emails',
          progress: 95,
          message: 'Sending notifications...'
        });

        try {
          const [challengerEmail, opponentEmail] = await Promise.all([
            db.select().from(developerEmails).where(eq(developerEmails.username, battle[0].challengerUsername)).limit(1),
            db.select().from(developerEmails).where(eq(developerEmails.username, battle[0].opponentUsername)).limit(1),
          ]);

          const emailPromises = [];

          if (challengerEmail[0]?.email) {
            emailPromises.push(
              sendBattleResultsEmail({
                recipientEmail: challengerEmail[0].email,
                recipientUsername: battle[0].challengerUsername,
                opponentUsername: battle[0].opponentUsername,
                won: challengerWon,
                yourScore: battleAnalysis.result.challengerScore.total,
                opponentScore: battleAnalysis.result.opponentScore.total,
                eloChange: eloChanges.challenger.change,
                newElo: eloChanges.challenger.newRating,
                reason: battleAnalysis.result.reason,
              })
            );
          }

          if (opponentEmail[0]?.email) {
            emailPromises.push(
              sendBattleResultsEmail({
                recipientEmail: opponentEmail[0].email,
                recipientUsername: battle[0].opponentUsername,
                opponentUsername: battle[0].challengerUsername,
                won: !challengerWon,
                yourScore: battleAnalysis.result.opponentScore.total,
                opponentScore: battleAnalysis.result.challengerScore.total,
                eloChange: eloChanges.opponent.change,
                newElo: eloChanges.opponent.newRating,
                reason: battleAnalysis.result.reason,
              })
            );
          }

          await Promise.all(emailPromises);
        } catch (emailError) {
          console.error('Failed to send battle results emails:', emailError);
        }

        sendEvent('complete', {
          status: 'completed',
          progress: 100,
          message: `Battle complete! Winner: ${battleAnalysis.result.winner}`,
          result: {
            winner: battleAnalysis.result.winner,
            challengerScore: battleAnalysis.result.challengerScore,
            opponentScore: battleAnalysis.result.opponentScore,
            eloChange: eloChanges,
            reason: battleAnalysis.result.reason,
            highlights: battleAnalysis.result.highlights,
            recommendations: battleAnalysis.result.recommendations,
          }
        });

        controller.close();
      } catch (error) {
        console.error('Battle execution error:', error);

        // Mark battle as failed
        try {
          await db
            .update(arenaBattles)
            .set({
              status: 'failed',
              completedAt: new Date(),
            })
            .where(eq(arenaBattles.id, battleId));
        } catch (dbError) {
          console.error('Failed to update battle status:', dbError);
        }

        sendEvent('error', {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
