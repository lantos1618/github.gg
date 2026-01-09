import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { sql, desc, and, gte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { generateJobEmbedding, generateProfileEmbedding, formatEmbeddingForPg } from '@/lib/ai/embeddings';
import { rankCandidates, type CandidateMatch } from '@/lib/ai/candidate-ranker';
import type { DeveloperProfile } from '@/lib/types/profile';

// Input schema for matching
const matchCandidatesInput = z.object({
  jobDescription: z.string().min(50, 'Job description must be at least 50 characters'),
  limit: z.number().min(1).max(50).default(20),
  minConfidence: z.number().min(0).max(100).optional(),
  archetypes: z.array(z.string()).optional(),
});

// Output schema for a matched candidate
const candidateMatchSchema = z.object({
  username: z.string(),
  summary: z.string().nullable(),
  archetype: z.string().nullable(),
  confidence: z.number(),
  similarityScore: z.number(),
  fitScore: z.number(),
  fitReason: z.string(),
  keyStrengths: z.array(z.string()),
  potentialGaps: z.array(z.string()),
  interviewFocus: z.array(z.string()),
  salaryRange: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string(),
  }),
  topSkills: z.array(z.object({
    name: z.string(),
    score: z.number(),
  })),
});

export type CandidateMatchOutput = z.infer<typeof candidateMatchSchema>;

export const hireRouter = router({
  /**
   * Match candidates to a job description using semantic search + AI ranking
   */
  matchCandidates: protectedProcedure
    .input(matchCandidatesInput)
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      const { jobDescription, limit, minConfidence, archetypes } = input;

      // Step 1: Generate embedding for the job description
      const jobEmbedding = await generateJobEmbedding(jobDescription);
      const embeddingStr = formatEmbeddingForPg(jobEmbedding);

      // Step 2: Vector similarity search
      // Get latest version of each profile with embeddings
      const latestVersions = db
        .select({
          username: developerProfileCache.username,
          maxVersion: sql<number>`MAX(${developerProfileCache.version})`.as('max_version'),
        })
        .from(developerProfileCache)
        .groupBy(developerProfileCache.username)
        .as('latest');

      // Build WHERE conditions
      const conditions: ReturnType<typeof sql>[] = [];

      if (minConfidence) {
        conditions.push(
          sql`(${developerProfileCache.profileData}->>'profileConfidence')::int >= ${minConfidence}`
        );
      }

      // Query with vector similarity - fetch more than limit for AI ranking
      const vectorSearchLimit = Math.min(limit * 3, 100);

      let candidatesQuery;

      // Check if embedding column exists and has data
      try {
        candidatesQuery = await db.execute(sql`
          SELECT
            p.username,
            p.profile_data as "profileData",
            p.embedding,
            1 - (p.embedding <=> ${embeddingStr}::vector) as similarity_score
          FROM developer_profile_cache p
          INNER JOIN (
            SELECT username, MAX(version) as max_version
            FROM developer_profile_cache
            GROUP BY username
          ) latest ON p.username = latest.username AND p.version = latest.max_version
          WHERE p.embedding IS NOT NULL
          ${minConfidence ? sql`AND (p.profile_data->>'profileConfidence')::int >= ${minConfidence}` : sql``}
          ORDER BY p.embedding <=> ${embeddingStr}::vector
          LIMIT ${vectorSearchLimit}
        `);
      } catch (error) {
        // Fallback: If vector search fails (no embeddings yet), use regular search
        console.warn('Vector search failed, falling back to regular search:', error);

        candidatesQuery = await db.execute(sql`
          SELECT
            p.username,
            p.profile_data as "profileData",
            0.5 as similarity_score
          FROM developer_profile_cache p
          INNER JOIN (
            SELECT username, MAX(version) as max_version
            FROM developer_profile_cache
            GROUP BY username
          ) latest ON p.username = latest.username AND p.version = latest.max_version
          WHERE 1=1
          ${minConfidence ? sql`AND (p.profile_data->>'profileConfidence')::int >= ${minConfidence}` : sql``}
          ORDER BY (p.profile_data->>'profileConfidence')::int DESC
          LIMIT ${vectorSearchLimit}
        `);
      }

      const rawCandidates = (candidatesQuery as unknown as Array<{
        username: string;
        profileData: DeveloperProfile;
        similarity_score: number;
      }>);

      if (rawCandidates.length === 0) {
        return {
          candidates: [],
          totalSearched: 0,
          searchTimeMs: Date.now() - startTime,
          message: 'No candidates found. Try adjusting your filters or ensure profiles have been analyzed.',
        };
      }

      // Filter by archetypes if specified
      let filteredCandidates = rawCandidates;
      if (archetypes && archetypes.length > 0) {
        filteredCandidates = rawCandidates.filter(c =>
          c.profileData?.developerArchetype &&
          archetypes.includes(c.profileData.developerArchetype)
        );
      }

      // Step 3: AI ranking of top candidates
      const candidatesForRanking = filteredCandidates.slice(0, limit).map(c => ({
        username: c.username,
        profile: c.profileData,
        similarityScore: Number(c.similarity_score) || 0.5,
      }));

      const rankedCandidates = await rankCandidates(jobDescription, candidatesForRanking);

      // Step 4: Format output
      const results: CandidateMatchOutput[] = rankedCandidates.map(c => ({
        username: c.username,
        summary: c.profile.summary || null,
        archetype: c.profile.developerArchetype || null,
        confidence: c.profile.profileConfidence || 0,
        similarityScore: Math.round(c.similarityScore * 100),
        fitScore: c.fit.fitScore,
        fitReason: c.fit.fitReason,
        keyStrengths: c.fit.keyStrengths,
        potentialGaps: c.fit.potentialGaps,
        interviewFocus: c.fit.interviewFocus,
        salaryRange: c.fit.estimatedSalaryRange,
        topSkills: (c.profile.skillAssessment || []).slice(0, 5).map(s => ({
          name: s.metric,
          score: s.score,
        })),
      }));

      return {
        candidates: results,
        totalSearched: rawCandidates.length,
        searchTimeMs: Date.now() - startTime,
      };
    }),

  /**
   * Generate and store embedding for a profile (for backfilling)
   */
  generateProfileEmbedding: protectedProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ input }) => {
      const { username } = input;
      const normalizedUsername = username.toLowerCase();

      // Get latest profile
      const profile = await db.execute(sql`
        SELECT id, profile_data as "profileData"
        FROM developer_profile_cache
        WHERE username = ${normalizedUsername}
        ORDER BY version DESC
        LIMIT 1
      `);

      const profileRows = profile as unknown as Array<{ id: string; profileData: DeveloperProfile }>;
      if (profileRows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found',
        });
      }

      const profileData = profileRows[0].profileData;
      const profileId = profileRows[0].id;

      // Generate embedding
      const embedding = await generateProfileEmbedding(profileData);
      const embeddingStr = formatEmbeddingForPg(embedding);

      // Update profile with embedding
      await db.execute(sql`
        UPDATE developer_profile_cache
        SET embedding = ${embeddingStr}::vector
        WHERE id = ${profileId}
      `);

      return { success: true, username: normalizedUsername };
    }),

  /**
   * Batch generate embeddings for all profiles without embeddings
   */
  backfillEmbeddings: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .mutation(async ({ input }) => {
      const { limit } = input;

      // Get profiles without embeddings (latest version only)
      const profilesWithoutEmbeddings = await db.execute(sql`
        SELECT p.id, p.username, p.profile_data as "profileData"
        FROM developer_profile_cache p
        INNER JOIN (
          SELECT username, MAX(version) as max_version
          FROM developer_profile_cache
          GROUP BY username
        ) latest ON p.username = latest.username AND p.version = latest.max_version
        WHERE p.embedding IS NULL
        LIMIT ${limit}
      `);

      const profiles = profilesWithoutEmbeddings as unknown as Array<{
        id: string;
        username: string;
        profileData: DeveloperProfile;
      }>;

      let processed = 0;
      let failed = 0;

      for (const profile of profiles) {
        try {
          const embedding = await generateProfileEmbedding(profile.profileData);
          const embeddingStr = formatEmbeddingForPg(embedding);

          await db.execute(sql`
            UPDATE developer_profile_cache
            SET embedding = ${embeddingStr}::vector
            WHERE id = ${profile.id}
          `);

          processed++;
        } catch (error) {
          console.error(`Failed to generate embedding for ${profile.username}:`, error);
          failed++;
        }
      }

      return {
        processed,
        failed,
        remaining: profiles.length === limit ? 'more profiles may need processing' : 'all profiles processed',
      };
    }),
});
