import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { generateEmbedding, formatEmbeddingForPg } from '@/lib/ai/embeddings';

interface ScorecardSearchRow {
  repoOwner: string;
  repoName: string;
  ref: string | null;
  overallScore: number;
  version: number;
  updatedAt: Date;
  similarityScore?: number;
}

export const repoSearchRouter = router({
  // Semantic search over public scorecards. When `query` is a free-text string
  // we embed it and rank by cosine similarity to the scorecard embedding.
  // When `query` is empty (or shorter than 2 chars), we just return the
  // newest public scorecards — so this procedure can back both the "browse"
  // and "search" states of the repos page.
  searchRepos: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const { query, limit, offset } = input;
      const trimmed = query?.trim() ?? '';

      // Privacy: only public scorecards are searchable for everyone. Signed-in
      // users additionally see their own private ones (matches getAllAnalyzedRepos).
      const currentUserId = ctx.session?.user?.id;
      const visibilityClause = currentUserId
        ? sql`(s.is_private = false OR s.user_id = ${currentUserId})`
        : sql`s.is_private = false`;

      // Latest version per (repo_owner, repo_name, ref). We collapse on
      // (owner, name) since the UI shows one row per repo; ties broken by
      // most-recent updatedAt.
      const latestPartition = sql`
        SELECT *
        FROM (
          SELECT
            s.*,
            ROW_NUMBER() OVER (
              PARTITION BY LOWER(s.repo_owner), LOWER(s.repo_name)
              ORDER BY s.updated_at DESC, s.version DESC
            ) AS rn
          FROM repository_scorecards s
          WHERE ${visibilityClause}
        ) t
        WHERE t.rn = 1
      `;

      if (trimmed.length >= 2) {
        // Semantic path: embed the query, rank by cosine distance. We over-
        // fetch (limit * 4) so a future filter step has room; for now we
        // just slice.
        let rows: ScorecardSearchRow[] = [];
        try {
          const queryEmbedding = await generateEmbedding(`Repository search: ${trimmed}`);
          const embeddingStr = formatEmbeddingForPg(queryEmbedding);
          const fetchLimit = Math.min(200, (limit + offset) * 4);
          const vectorResults = await db.execute(sql`
            WITH latest AS (${latestPartition})
            SELECT
              l.repo_owner as "repoOwner",
              l.repo_name as "repoName",
              l.ref as "ref",
              l.overall_score as "overallScore",
              l.version as "version",
              l.updated_at as "updatedAt",
              1 - (l.embedding <=> ${embeddingStr}::vector) as similarity_score
            FROM latest l
            WHERE l.embedding IS NOT NULL
            ORDER BY l.embedding <=> ${embeddingStr}::vector
            LIMIT ${fetchLimit}
          `);
          rows = (vectorResults as unknown as Array<{
            repoOwner: string;
            repoName: string;
            ref: string | null;
            overallScore: number;
            version: number;
            updatedAt: Date;
            similarity_score: number;
          }>).map(r => ({
            repoOwner: r.repoOwner,
            repoName: r.repoName,
            ref: r.ref,
            overallScore: r.overallScore,
            version: r.version,
            updatedAt: new Date(r.updatedAt),
            similarityScore: Number(r.similarity_score) || 0,
          }));
        } catch (err) {
          console.warn('[repoSearch.searchRepos] vector search failed, falling back to ILIKE:', err);
        }

        // Fallback / supplement: a plain substring match. We always run this
        // when vector returned nothing, and merge it underneath vector hits
        // when vector returned something — so repos without embeddings yet
        // still show up if their name matches.
        if (rows.length < limit + offset) {
          // Escape LIKE metacharacters in user input so a query like "re_o" or
          // "%" matches literally instead of being treated as a wildcard.
          const escapedQuery = trimmed.toLowerCase().replace(/[\\%_]/g, '\\$&');
          const ilikeResults = await db.execute(sql`
            WITH latest AS (${latestPartition})
            SELECT
              l.repo_owner as "repoOwner",
              l.repo_name as "repoName",
              l.ref as "ref",
              l.overall_score as "overallScore",
              l.version as "version",
              l.updated_at as "updatedAt"
            FROM latest l
            WHERE LOWER(l.repo_owner || '/' || l.repo_name) LIKE ${'%' + escapedQuery + '%'} ESCAPE '\\'
            ORDER BY l.updated_at DESC
            LIMIT ${limit + offset}
          `);
          const ilikeRows = (ilikeResults as unknown as ScorecardSearchRow[]).map(r => ({
            ...r,
            updatedAt: new Date(r.updatedAt),
          }));
          const seen = new Set(rows.map(r => `${r.repoOwner.toLowerCase()}/${r.repoName.toLowerCase()}`));
          for (const r of ilikeRows) {
            const key = `${r.repoOwner.toLowerCase()}/${r.repoName.toLowerCase()}`;
            if (!seen.has(key)) {
              rows.push(r);
              seen.add(key);
            }
          }
        }

        // Semantic mode over-fetches up to fetchLimit; total/hasMore reflect
        // what we have in hand, not a global COUNT (that would require a
        // second pass). Good enough for UI hint, not authoritative.
        return {
          results: rows.slice(offset, offset + limit),
          total: rows.length,
          hasMore: rows.length > offset + limit,
          mode: 'semantic' as const,
          totalIsExact: false,
        };
      }

      // Browse path: no query, just return newest first.
      const browseResults = await db.execute(sql`
        WITH latest AS (${latestPartition})
        SELECT
          l.repo_owner as "repoOwner",
          l.repo_name as "repoName",
          l.ref as "ref",
          l.overall_score as "overallScore",
          l.version as "version",
          l.updated_at as "updatedAt"
        FROM latest l
        ORDER BY l.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const rows = (browseResults as unknown as ScorecardSearchRow[]).map(r => ({
        ...r,
        updatedAt: new Date(r.updatedAt),
      }));
      return {
        results: rows,
        total: rows.length,
        hasMore: rows.length === limit,
        mode: 'browse' as const,
      };
    }),

  // Given an (owner, repo), return the most semantically similar other repos
  // based on the scorecard embedding. Mirrors discover.getSimilarDevelopers.
  getSimilarRepos: publicProcedure
    .input(z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      limit: z.number().min(1).max(20).optional().default(6),
    }))
    .query(async ({ input, ctx }) => {
      const { owner, repo, limit } = input;
      const currentUserId = ctx.session?.user?.id;
      const visibilityClause = currentUserId
        ? sql`(s.is_private = false OR s.user_id = ${currentUserId})`
        : sql`s.is_private = false`;

      // Source row: the latest embedded scorecard for the given (owner, repo).
      // Apply the same visibility gate as the neighbours query — otherwise an
      // unauthenticated caller can probe whether a private scorecard exists
      // by observing whether this endpoint returns results vs 'unavailable'.
      const sourceResult = await db.execute(sql`
        SELECT embedding
        FROM repository_scorecards
        WHERE LOWER(repo_owner) = LOWER(${owner})
          AND LOWER(repo_name) = LOWER(${repo})
          AND embedding IS NOT NULL
          AND ${currentUserId
            ? sql`(is_private = false OR user_id = ${currentUserId})`
            : sql`is_private = false`}
        ORDER BY updated_at DESC, version DESC
        LIMIT 1
      `);
      const source = sourceResult[0] as { embedding: string | null } | undefined;
      if (!source?.embedding) {
        return { results: [], mode: 'unavailable' as const };
      }

      // The pgvector driver returns the embedding as the literal pg-text form
      // (e.g. "[0.01,0.02,...]"). It's already a valid ::vector cast input.
      const embeddingStr = typeof source.embedding === 'string'
        ? source.embedding
        : formatEmbeddingForPg(source.embedding as number[]);

      const neighbours = await db.execute(sql`
        WITH latest AS (
          SELECT *
          FROM (
            SELECT
              s.*,
              ROW_NUMBER() OVER (
                PARTITION BY LOWER(s.repo_owner), LOWER(s.repo_name)
                ORDER BY s.updated_at DESC, s.version DESC
              ) AS rn
            FROM repository_scorecards s
            WHERE ${visibilityClause}
              AND NOT (LOWER(s.repo_owner) = LOWER(${owner}) AND LOWER(s.repo_name) = LOWER(${repo}))
          ) t
          WHERE t.rn = 1
        )
        SELECT
          l.repo_owner as "repoOwner",
          l.repo_name as "repoName",
          l.ref as "ref",
          l.overall_score as "overallScore",
          l.version as "version",
          l.updated_at as "updatedAt",
          1 - (l.embedding <=> ${embeddingStr}::vector) as similarity_score
        FROM latest l
        WHERE l.embedding IS NOT NULL
        ORDER BY l.embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `);

      const rows = (neighbours as unknown as Array<{
        repoOwner: string;
        repoName: string;
        ref: string | null;
        overallScore: number;
        version: number;
        updatedAt: Date;
        similarity_score: number;
      }>).map(r => ({
        repoOwner: r.repoOwner,
        repoName: r.repoName,
        ref: r.ref,
        overallScore: r.overallScore,
        version: r.version,
        updatedAt: new Date(r.updatedAt),
        similarityScore: Number(r.similarity_score) || 0,
      }));

      return { results: rows, mode: 'semantic' as const };
    }),
});
