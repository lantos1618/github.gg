import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { repositoryScorecards, user as users } from '@/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { requireApiKey, isErrorResponse } from '@/lib/api/auth';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';
import type { BetterAuthSession } from '@/lib/github';

type RouteContext = {
  params: Promise<{ owner: string; repo: string }>;
};

/**
 * GET /api/v1/scorecards/:owner/:repo
 *
 * Returns the repository scorecard for a given repo.
 * Requires API key authentication.
 *
 * Query params:
 * - version: specific version number (optional, defaults to latest)
 *
 * Response:
 * {
 *   "owner": "string",
 *   "repo": "string",
 *   "scorecard": { ... } | null,
 *   "version": number,
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
    const { owner, repo } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const requestedVersion = searchParams.get('version') ? parseInt(searchParams.get('version')!) : undefined;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo are required' },
        { status: 400 }
      );
    }
    if (requestedVersion !== undefined && (!Number.isSafeInteger(requestedVersion) || requestedVersion < 1)) {
      return NextResponse.json({ error: 'Invalid version' }, { status: 400 });
    }

    // Normalize to lowercase for database lookup
    const normalizedOwner = owner.toLowerCase();
    const normalizedRepo = repo.toLowerCase();

    // An API key identifies its owner, but it is not a browser session. Use
    // that validated user ID to check the owner's current GitHub permission.
    const keyOwner = await db.query.user.findFirst({ where: eq(users.id, authResult.userId) });
    if (!keyOwner) {
      return NextResponse.json({ error: 'Unable to access repository' }, { status: 403 });
    }
    const accessSession = { user: { id: keyOwner.id } } as BetterAuthSession;
    const repoInfo = await getAccessibleRepositoryInfo(owner, repo, accessSession);
    if (!repoInfo) {
      return NextResponse.json({ error: 'Unable to access repository' }, { status: 403 });
    }
    const cacheControl = 'private, no-store';

    // Build query conditions
    const conditions = [
      eq(repositoryScorecards.repoOwner, normalizedOwner),
      eq(repositoryScorecards.repoName, normalizedRepo),
    ];
    if (repoInfo.private) {
      conditions.push(eq(repositoryScorecards.userId, authResult.userId));
    } else {
      conditions.push(or(
        eq(repositoryScorecards.isPrivate, false),
        eq(repositoryScorecards.userId, authResult.userId)
      )!);
    }

    if (requestedVersion !== undefined) {
      conditions.push(eq(repositoryScorecards.version, requestedVersion));
    }

    // Fetch scorecard
    const scorecards = await db
      .select()
      .from(repositoryScorecards)
      .where(and(...conditions))
      .orderBy(desc(repositoryScorecards.version))
      .limit(1);

    if (scorecards.length === 0) {
      return NextResponse.json({
        owner: normalizedOwner,
        repo: normalizedRepo,
        scorecard: null,
        version: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      }, { status: 200, headers: { 'Cache-Control': cacheControl } });
    }

    const scorecard = scorecards[0];
    const isStale = new Date().getTime() - scorecard.updatedAt.getTime() > 7 * 24 * 60 * 60 * 1000; // 7 days

    return NextResponse.json({
      owner: normalizedOwner,
      repo: normalizedRepo,
      scorecard: {
        overallScore: scorecard.overallScore,
        metrics: scorecard.metrics,
        markdown: scorecard.markdown,
      },
      version: scorecard.version,
      cached: true,
      stale: isStale,
      lastUpdated: scorecard.updatedAt.toISOString(),
      ref: scorecard.ref,
    }, {
      headers: {
        'Cache-Control': cacheControl,
      }
    });
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scorecard' },
      { status: 500 }
    );
  }
}
