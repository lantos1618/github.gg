import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { desc, sql, and } from 'drizzle-orm';
import type { DeveloperProfile } from '@/lib/types/profile';
import { requireApiKey, isErrorResponse } from '@/lib/api/auth';

/**
 * GET /api/v1/profiles/search
 *
 * Search developer profiles with filters.
 *
 * Query params:
 * - skills: comma-separated list of skills (e.g., "React,TypeScript")
 * - archetypes: comma-separated list (e.g., "Production Builder,Full-Stack Generalist")
 * - minConfidence: minimum profile confidence (0-100)
 * - q: free text search (searches name and summary)
 * - limit: max results (default 50, max 100)
 * - offset: pagination offset
 *
 * Response:
 * {
 *   "results": [...],
 *   "total": number,
 *   "limit": number,
 *   "offset": number,
 *   "hasMore": boolean
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

    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
    const archetypes = searchParams.get('archetypes')?.split(',').filter(Boolean) || [];
    const minConfidence = searchParams.get('minConfidence') ? parseInt(searchParams.get('minConfidence')!) : undefined;
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build SQL conditions for filtering
    const conditions: ReturnType<typeof sql>[] = [];

    if (minConfidence !== undefined && minConfidence > 0) {
      conditions.push(
        sql`(${developerProfileCache.profileData}->>'profileConfidence')::int >= ${minConfidence}`
      );
    }

    if (archetypes.length > 0) {
      const archetypeConditions = archetypes.map(
        archetype => sql`${developerProfileCache.profileData}->>'developerArchetype' = ${archetype}`
      );
      conditions.push(sql`(${sql.join(archetypeConditions, sql` OR `)})`);
    }

    // Get max version per username first (subquery approach)
    const maxVersionsSubquery = db
      .select({
        username: developerProfileCache.username,
        maxVersion: sql<number>`MAX(${developerProfileCache.version})`.as('max_version'),
      })
      .from(developerProfileCache)
      .groupBy(developerProfileCache.username)
      .as('max_versions');

    // Main query with join to get only latest versions
    let baseQuery = db
      .select({
        username: developerProfileCache.username,
        profileData: developerProfileCache.profileData,
        updatedAt: developerProfileCache.updatedAt,
        version: developerProfileCache.version,
      })
      .from(developerProfileCache)
      .innerJoin(
        maxVersionsSubquery,
        and(
          sql`${developerProfileCache.username} = ${maxVersionsSubquery.username}`,
          sql`${developerProfileCache.version} = ${maxVersionsSubquery.maxVersion}`
        )
      );

    // Apply conditions if any
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
    }

    // Execute query
    const allProfiles = await baseQuery
      .orderBy(desc(developerProfileCache.updatedAt))
      .limit(limit + 1) // Fetch one extra to check hasMore
      .offset(offset);

    // Apply client-side filters that are harder to do in SQL
    let filtered = allProfiles.filter(profile => {
      const data = profile.profileData as DeveloperProfile;

      // Skills filter - check if profile has matching skills
      if (skills.length > 0) {
        const profileSkills = [
          ...(data.skillAssessment?.map(s => s.metric.toLowerCase()) || []),
          ...(data.techStack?.map(t => t.name.toLowerCase()) || []),
        ];
        const hasMatchingSkill = skills.some(skill =>
          profileSkills.some(ps => ps.includes(skill.toLowerCase()))
        );
        if (!hasMatchingSkill) return false;
      }

      // Text search filter
      if (query && query.trim()) {
        const searchTerms = query.toLowerCase();
        const searchableText = [
          profile.username,
          data.summary || '',
          data.developerArchetype || '',
          ...(data.skillAssessment?.map(s => s.metric) || []),
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchTerms)) return false;
      }

      return true;
    });

    const hasMore = filtered.length > limit;
    if (hasMore) {
      filtered = filtered.slice(0, limit);
    }

    // Transform to API response format
    const results = filtered.map(profile => {
      const data = profile.profileData as DeveloperProfile;
      return {
        username: profile.username,
        summary: data.summary,
        archetype: data.developerArchetype,
        confidence: data.profileConfidence,
        topSkills: data.skillAssessment?.slice(0, 5).map(s => ({
          name: s.metric,
          score: s.score,
        })) || [],
        updatedAt: profile.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      results,
      total: results.length,
      limit,
      offset,
      hasMore,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });
  } catch (error) {
    console.error('Error searching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to search profiles' },
      { status: 500 }
    );
  }
}
