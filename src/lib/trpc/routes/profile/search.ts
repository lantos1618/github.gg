import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { generateEmbedding, formatEmbeddingForPg } from '@/lib/ai/embeddings';
import { reserveSemanticSearchEmbedding } from '@/lib/rate-limit/semantic-search';
import type { DeveloperProfile } from '@/lib/types/profile';
import { filterCurrentlyPublicProfiles } from '@/lib/profile/public-provenance';

export const profileSearchRouter = router({
  // Search profiles by skills, archetype, confidence, with semantic search
  // fallback when a free-text query is provided.
  searchProfiles: publicProcedure
    .input(z.object({
      skills: z.array(z.string().max(100)).max(20).optional(),
      archetypes: z.array(z.string().max(100)).max(20).optional(),
      minConfidence: z.number().min(0).max(100).optional(),
      maxConfidence: z.number().min(0).max(100).optional(),
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(100).optional().default(50),
      offset: z.number().int().min(0).max(199).optional().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const { skills, archetypes, minConfidence, maxConfidence, query, limit, offset } = input;
      const trimmed = query?.trim() ?? '';

      let allProfiles: Array<{
        username: string;
        profileData: unknown;
        updatedAt: Date;
        version: number;
        similarityScore?: number;
      }>;

      if (trimmed.length >= 2) {
        const canEmbed = await reserveSemanticSearchEmbedding(ctx.req, ctx.session?.user?.id);
        if (canEmbed) {
          try {
            const queryEmbedding = await generateEmbedding(`Developer search: ${trimmed}`);
            const embeddingStr = formatEmbeddingForPg(queryEmbedding);

            const vectorResults = await db.execute(sql`
            SELECT
              p.username,
              p.profile_data as "profileData",
              p.updated_at as "updatedAt",
              p.version,
              1 - (p.embedding <=> ${embeddingStr}::vector) as similarity_score
            FROM developer_profile_cache p
            INNER JOIN (
              SELECT username, MAX(version) as max_version
              FROM developer_profile_cache
              GROUP BY username
            ) latest ON p.username = latest.username AND p.version = latest.max_version
            WHERE p.embedding IS NOT NULL
              AND p.profile_data->>'visibilityVerified' = 'true'
            ${minConfidence ? sql`AND (p.profile_data->>'profileConfidence')::int >= ${minConfidence}` : sql``}
            ${maxConfidence ? sql`AND (p.profile_data->>'profileConfidence')::int <= ${maxConfidence}` : sql``}
            ORDER BY p.embedding <=> ${embeddingStr}::vector
            LIMIT 200
          `);

            allProfiles = (vectorResults as unknown as Array<{
              username: string;
              profileData: DeveloperProfile;
              updatedAt: Date;
              version: number;
              similarity_score: number;
            }>).map(r => ({
              ...r,
              similarityScore: Number(r.similarity_score) || 0,
            }));
          } catch (error) {
            console.warn('Semantic search failed, falling back to basic search:', error);
            allProfiles = await fetchLatestProfiles(trimmed);
          }
        } else {
          allProfiles = await fetchLatestProfiles(trimmed);
        }
      } else {
        allProfiles = await fetchLatestProfiles(trimmed);
      }

      const publicProfiles = await filterCurrentlyPublicProfiles(allProfiles);
      const filtered = publicProfiles.filter(profile => {
        const data = profile.profileData as DeveloperProfile;
        if (!data) return false;

        if (archetypes && archetypes.length > 0) {
          if (!data.developerArchetype || !archetypes.includes(data.developerArchetype)) {
            return false;
          }
        }

        // Apply these after either vector or text search; the text fallback
        // intentionally does not depend on the embedding query's SQL filters.
        if (minConfidence !== undefined && (data.profileConfidence ?? 0) < minConfidence) return false;
        if (maxConfidence !== undefined && (data.profileConfidence ?? 100) > maxConfidence) return false;

        if (skills && skills.length > 0) {
          const profileSkills = [
            ...(data.skillAssessment?.map(s => s.metric.toLowerCase()) || []),
            ...(data.techStack?.map(t => t.name.toLowerCase()) || []),
          ];
          const hasMatchingSkill = skills.some(skill => {
            const skillLower = skill.toLowerCase();
            return profileSkills.some(ps => ps.includes(skillLower) || skillLower.includes(ps));
          });
          if (!hasMatchingSkill) return false;
        }

        return true;
      });

      const scored = filtered.map(profile => {
        const data = profile.profileData as DeveloperProfile;
        let score = 0;

        if (profile.similarityScore !== undefined) {
          score += profile.similarityScore * 100;
        }

        score += (data.profileConfidence ?? 50) / 4;

        if (skills && skills.length > 0) {
          const profileSkills = data.skillAssessment?.map(s => ({
            name: s.metric.toLowerCase(),
            score: s.score,
          })) || [];
          skills.forEach(skill => {
            const skillLower = skill.toLowerCase();
            const match = profileSkills.find(ps =>
              ps.name.includes(skillLower) || skillLower.includes(ps.name)
            );
            if (match) score += match.score * 2;
          });
        }

        if (data.developerArchetype === 'Production Builder') score += 5;

        return { ...profile, matchScore: Math.round(score) };
      });

      scored.sort((a, b) => b.matchScore - a.matchScore);
      const paginated = scored.slice(offset, offset + limit);

      return {
        results: paginated.map(p => {
          const data = p.profileData as DeveloperProfile;
          return {
            username: p.username,
            summary: data.summary,
            archetype: data.developerArchetype,
            confidence: data.profileConfidence,
            topSkills: data.skillAssessment?.slice(0, 5).map(s => ({ name: s.metric, score: s.score })) || [],
            techStack: data.techStack?.slice(0, 8).map(t => t.name) || [],
            matchScore: p.matchScore,
            updatedAt: p.updatedAt,
          };
        }),
        total: scored.length,
        hasMore: offset + limit < scored.length,
      };
    }),
});

async function fetchLatestProfiles(query = '') {
  const maxVersions = db
    .select({
      username: developerProfileCache.username,
      maxVersion: sql<number>`MAX(${developerProfileCache.version})`.as('max_version'),
    })
    .from(developerProfileCache)
    .groupBy(developerProfileCache.username)
    .as('max_versions');

  return db
    .select({
      username: developerProfileCache.username,
      profileData: developerProfileCache.profileData,
      updatedAt: developerProfileCache.updatedAt,
      version: developerProfileCache.version,
    })
    .from(developerProfileCache)
    .innerJoin(
      maxVersions,
      and(
        eq(developerProfileCache.username, maxVersions.username),
        eq(developerProfileCache.version, maxVersions.maxVersion)
      )
    )
    .where(and(
      sql`${developerProfileCache.profileData}->>'visibilityVerified' = 'true'`,
      query
        ? sql`(
            STRPOS(LOWER(${developerProfileCache.username}), ${query.toLowerCase()}) > 0
            OR STRPOS(LOWER(${developerProfileCache.profileData}::text), ${query.toLowerCase()}) > 0
          )`
        : undefined,
    ))
    .orderBy(desc(developerProfileCache.updatedAt))
    .limit(200);
}
