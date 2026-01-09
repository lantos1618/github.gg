import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { developerRankings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireApiKey, isErrorResponse } from '@/lib/api/auth';

/**
 * GET /api/v1/arena/leaderboard
 * Requires API key authentication.
 *
 * Returns the arena leaderboard with developer rankings.
 *
 * Query params:
 * - limit: max results (default 50, max 100)
 * - offset: pagination offset (default 0)
 * - tier: filter by tier (optional)
 *
 * Response:
 * {
 *   "leaderboard": [
 *     {
 *       "rank": number,
 *       "username": "string",
 *       "eloRating": number,
 *       "tier": "string",
 *       "wins": number,
 *       "losses": number,
 *       "winRate": number,
 *       "totalBattles": number,
 *       "winStreak": number
 *     }
 *   ],
 *   "limit": number,
 *   "offset": number
 * }
 */
export async function GET(request: NextRequest) {
  // Require API key with 'read' scope
  const authResult = await requireApiKey(request, 'read');
  if (isErrorResponse(authResult)) {
    return authResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const tier = searchParams.get('tier') || undefined;

    // Build and execute query
    const rankings = tier
      ? await db
          .select()
          .from(developerRankings)
          .where(eq(developerRankings.tier, tier))
          .orderBy(desc(developerRankings.eloRating))
          .limit(limit)
          .offset(offset)
      : await db
          .select()
          .from(developerRankings)
          .orderBy(desc(developerRankings.eloRating))
          .limit(limit)
          .offset(offset);

    const leaderboard = rankings.map((ranking, index) => ({
      rank: offset + index + 1,
      username: ranking.username,
      eloRating: ranking.eloRating,
      tier: ranking.tier,
      wins: ranking.wins,
      losses: ranking.losses,
      winRate: ranking.totalBattles > 0 ? Math.round((ranking.wins / ranking.totalBattles) * 100 * 10) / 10 : 0,
      totalBattles: ranking.totalBattles,
      winStreak: ranking.winStreak,
    }));

    return NextResponse.json({
      leaderboard,
      limit,
      offset,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
