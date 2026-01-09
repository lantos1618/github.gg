import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { developerRankings } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireApiKey, isErrorResponse } from '@/lib/api/auth';

type RouteContext = {
  params: Promise<{ username: string }>;
};

/**
 * GET /api/v1/arena/rankings/:username
 * Requires API key authentication.
 *
 * Returns the arena ranking for a specific user.
 *
 * Response:
 * {
 *   "username": "string",
 *   "ranking": {
 *     "rank": number,
 *     "eloRating": number,
 *     "tier": "string",
 *     "wins": number,
 *     "losses": number,
 *     "winRate": number,
 *     "totalBattles": number,
 *     "winStreak": number
 *   } | null
 * }
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  // Require API key with 'read' scope
  const authResult = await requireApiKey(request, 'read');
  if (isErrorResponse(authResult)) {
    return authResult;
  }

  try {
    const { username } = await context.params;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const normalizedUsername = username.toLowerCase();

    // Get the user's ranking
    const rankings = await db
      .select()
      .from(developerRankings)
      .where(eq(developerRankings.username, normalizedUsername))
      .limit(1);

    if (rankings.length === 0) {
      return NextResponse.json({
        username: normalizedUsername,
        ranking: null,
      }, { status: 200 });
    }

    const userRanking = rankings[0];

    // Calculate their global rank
    const higherRanked = await db
      .select({ count: sql<number>`count(*)` })
      .from(developerRankings)
      .where(sql`${developerRankings.eloRating} > ${userRanking.eloRating}`);

    const rank = (higherRanked[0]?.count || 0) + 1;

    return NextResponse.json({
      username: normalizedUsername,
      ranking: {
        rank,
        eloRating: userRanking.eloRating,
        tier: userRanking.tier,
        wins: userRanking.wins,
        losses: userRanking.losses,
        winRate: userRanking.totalBattles > 0
          ? Math.round((userRanking.wins / userRanking.totalBattles) * 100 * 10) / 10
          : 0,
        totalBattles: userRanking.totalBattles,
        winStreak: userRanking.winStreak,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking' },
      { status: 500 }
    );
  }
}
