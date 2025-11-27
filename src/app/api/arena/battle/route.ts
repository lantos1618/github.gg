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
import { generateDeveloperProfileStreaming } from '@/lib/ai/developer-profile';
import type { DeveloperProfile } from '@/lib/types/profile';
import type { BattleCriteria } from '@/lib/types/arena';
import { sendBattleResultsEmail } from '@/lib/email/resend';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { createLogger } from '@/lib/logging';

const logger = createLogger('ArenaBattle');

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

          // Filter repos: include originals + forks where user has commits
          sendEvent('progress', {
            status: 'filtering_repos',
            progress: role === 'challenger' ? 18 : 38,
            message: `Checking ${repos.length} repos for actual contributions...`
          });

          const validRepos = [];
          const forkRepos = repos.filter(r => r.fork);
          const nonForkRepos = repos.filter(r => !r.fork);

          // Always include non-fork repos
          validRepos.push(...nonForkRepos);

          // For forks, check if user has commits
          for (const forkRepo of forkRepos) {
            try {
              const commits = await githubService['octokit'].rest.repos.listCommits({
                owner: forkRepo.owner,
                repo: forkRepo.name,
                author: username,
                per_page: 1 // Just need to know if they have ANY commits
              });

              if (commits.data.length > 0) {
                validRepos.push(forkRepo);
              }
            } catch (error) {
              // If we can't check commits (e.g., rate limit), skip this fork
              logger.warn(`Failed to check commits for fork ${forkRepo.name}`, {
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }

          if (validRepos.length === 0) throw new Error(`${username} has no repositories with their contributions.`);

          const topRepos = validRepos
            .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0))
            .slice(0, 20);

          sendEvent('progress', {
            status: 'generating_profile',
            progress: role === 'challenger' ? 20 : 40,
            message: `Found ${repos.length} repos (${validRepos.length} with contributions), analyzing top ${topRepos.length} for ${username}...`
          });

          let profileResult;
          
          // Use streaming generator and bridge progress events
          const generator = generateDeveloperProfileStreaming({
            username,
            repos: validRepos,
            userId: session.user.id,
          });

          for await (const update of generator) {
            if (update.type === 'progress') {
              // Bridge the progress update to SSE
              // We need to map the generator's progress (0-100) to the battle's progress range for this user
              // Battle progress allocation:
              // Challenger: 20-40 (range size 20)
              // Opponent: 40-60 (range size 20)
              
              if (update.metadata) {
              const baseProgress = role === 'challenger' ? 20 : 40;
                const rangeSize = 20;
                const { current, total, repoName } = update.metadata;
              const progressIncrement = Math.floor((current / total) * rangeSize);

              sendEvent('progress', {
                status: 'analyzing_repo',
                progress: baseProgress + progressIncrement,
                message: `Analyzing repo ${current}/${total}: ${repoName}`,
                repoName,
                current,
                total
              });
            }
            } else if (update.type === 'complete' && update.result) {
              profileResult = update.result;
            }
          }

          if (!profileResult) {
             throw new Error(`Failed to generate profile for ${username}`);
          }

          const maxVersionResult = await db
            .select({ max: sql<number>`MAX(version)` })
            .from(developerProfileCache)
            .where(eq(developerProfileCache.username, normalizedUsername));
          const nextVersion = (maxVersionResult[0]?.max || 0) + 1;

          await db.insert(developerProfileCache).values({
            username: normalizedUsername,
            version: nextVersion,
            profileData: profileResult.profile,
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: [developerProfileCache.username, developerProfileCache.version],
            set: { profileData: profileResult.profile, updatedAt: new Date() }
          });

          sendEvent('progress', {
            status: 'profile_generated',
            progress: role === 'challenger' ? 25 : 45,
            message: `Profile generated for ${username}`
          });

          return profileResult.profile;
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
          model: 'gemini-3-pro-preview',
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
