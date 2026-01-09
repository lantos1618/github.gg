import { NextRequest, NextResponse } from 'next/server';
import { getProfileData } from '@/lib/profile/service';
import { requireApiKey, isErrorResponse } from '@/lib/api/auth';

type RouteContext = {
  params: Promise<{ username: string }>;
};

/**
 * GET /api/v1/profiles/:username
 *
 * Returns the developer profile for a given GitHub username.
 * Requires API key authentication.
 *
 * Response:
 * {
 *   "username": "string",
 *   "profile": { ... } | null,
 *   "cached": boolean,
 *   "stale": boolean,
 *   "lastUpdated": "ISO date string" | null
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

    if (!username || username.length < 1) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const data = await getProfileData(username);

    return NextResponse.json({
      username: username.toLowerCase(),
      profile: data.profile,
      cached: data.cached,
      stale: data.stale,
      lastUpdated: data.lastUpdated?.toISOString() || null,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
