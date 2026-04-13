import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache, networkCache } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import type { DeveloperProfile } from '@/lib/types/profile';
import { Octokit } from '@octokit/rest';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface GraphQLUserResult {
  login: string;
  name: string | null;
  bio: string | null;
  followers: { totalCount: number };
  following: { totalCount: number };
  repositories: { totalCount: number };
}

/**
 * Batch-fetch user details via GitHub GraphQL API.
 * One request for up to ~50 users instead of N individual REST calls.
 */
async function batchGetUserDetails(
  octokit: Octokit,
  logins: string[],
): Promise<Map<string, GraphQLUserResult>> {
  const results = new Map<string, GraphQLUserResult>();
  if (logins.length === 0) return results;

  const CHUNK = 50;
  for (let i = 0; i < logins.length; i += CHUNK) {
    const chunk = logins.slice(i, i + CHUNK);
    const fragments = chunk.map((login, idx) =>
      `u${idx}: user(login: ${JSON.stringify(login)}) { login name bio followers { totalCount } following { totalCount } repositories(privacy: PUBLIC) { totalCount } }`
    ).join('\n');

    try {
      const data: Record<string, GraphQLUserResult | null> = await (octokit as any).graphql(`{ ${fragments} }`);
      for (const val of Object.values(data)) {
        if (val?.login) results.set(val.login.toLowerCase(), val);
      }
    } catch (err) {
      console.error('[discover] GraphQL batch failed:', err);
    }
  }
  return results;
}

/** Batch check which usernames have GG profiles */
async function getGGProfiles(logins: string[]): Promise<Set<string>> {
  if (logins.length === 0) return new Set();
  try {
    const rows = await db.selectDistinct({ username: developerProfileCache.username })
      .from(developerProfileCache)
      .where(inArray(developerProfileCache.username, logins.map(l => l.toLowerCase())));
    return new Set(rows.map(r => r.username));
  } catch {
    return new Set();
  }
}

// --- Network cache ---
interface CachedNetworkData {
  users: Array<{
    username: string;
    avatar: string;
    name: string | null;
    bio: string | null;
    publicRepos: number;
    followers: number;
    following?: number;
    isFollower: boolean;
    isFollowing: boolean;
    isMutual: boolean;
    hasGGProfile: boolean;
  }>;
  seed: string;
  seedAvatar: string;
  followerCount: number;
  followingCount: number;
}

async function getCachedNetwork(username: string): Promise<CachedNetworkData | null> {
  try {
    const rows = await db.select().from(networkCache).where(eq(networkCache.username, username.toLowerCase())).limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    const age = Date.now() - new Date(row.updatedAt).getTime();
    if (age > CACHE_TTL_MS) return null;
    return row.networkData as CachedNetworkData;
  } catch {
    return null;
  }
}

async function setCachedNetwork(username: string, data: CachedNetworkData): Promise<void> {
  try {
    await db.insert(networkCache)
      .values({ username: username.toLowerCase(), networkData: data as any, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: networkCache.username,
        set: { networkData: data as any, updatedAt: new Date() },
      });
  } catch {
    // table might not exist yet
  }
}

export const discoverRouter = router({
  /**
   * Fetch unified network: followers + following + enrichment via GraphQL.
   * Single server call does everything. Cached in PG for 24h.
   */
  getUnifiedNetwork: protectedProcedure
    .input(z.object({
      username: z.string().min(1),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const cached = await getCachedNetwork(input.username);
      if (cached) {
        console.log(`[discover] cache HIT for ${input.username} (${cached.users.length} users)`);
        return cached;
      }
      console.log(`[discover] cache MISS for ${input.username} — fetching from GitHub`);

      const githubService = await createGitHubServiceForUserOperations(ctx.session);
      const octokit = githubService['octokit'];

      // Fetch followers + following + seed profile in parallel
      const [{ data: followersRaw }, { data: followingRaw }, seedProfile] = await Promise.all([
        octokit.users.listFollowersForUser({ username: input.username, per_page: input.limit }),
        octokit.users.listFollowingForUser({ username: input.username, per_page: input.limit }),
        octokit.users.getByUsername({ username: input.username }).then(r => r.data).catch(() => null),
      ]);

      // Merge
      const userMap = new Map<string, { login: string; avatar_url: string; isFollower: boolean; isFollowing: boolean }>();
      for (const u of followersRaw) {
        userMap.set(u.login.toLowerCase(), { login: u.login, avatar_url: u.avatar_url, isFollower: true, isFollowing: false });
      }
      for (const u of followingRaw) {
        const key = u.login.toLowerCase();
        const existing = userMap.get(key);
        if (existing) existing.isFollowing = true;
        else userMap.set(key, { login: u.login, avatar_url: u.avatar_url, isFollower: false, isFollowing: true });
      }

      // Enrich via GraphQL + GG check in parallel
      const allLogins = Array.from(userMap.values()).map(u => u.login);
      const [userDetails, ggProfiles] = await Promise.all([
        batchGetUserDetails(octokit, allLogins),
        getGGProfiles(allLogins),
      ]);

      const users = Array.from(userMap.values()).map(u => {
        const details = userDetails.get(u.login.toLowerCase());
        return {
          username: u.login,
          avatar: u.avatar_url,
          name: details?.name || null,
          bio: details?.bio || null,
          publicRepos: details?.repositories?.totalCount || 0,
          followers: details?.followers?.totalCount || 0,
          following: details?.following?.totalCount || 0,
          isFollower: u.isFollower,
          isFollowing: u.isFollowing,
          isMutual: u.isFollower && u.isFollowing,
          hasGGProfile: ggProfiles.has(u.login.toLowerCase()),
        };
      }).sort((a, b) => b.followers - a.followers);

      const seedAvatar = seedProfile?.avatar_url || `https://avatars.githubusercontent.com/${input.username}`;

      const result: CachedNetworkData = {
        users,
        seed: input.username,
        seedAvatar,
        followerCount: followersRaw.length,
        followingCount: followingRaw.length,
      };

      // Cache in background
      setCachedNetwork(input.username, result);

      return result;
    }),

  /**
   * Find developers semantically similar via pgvector.
   */
  getSimilarDevelopers: publicProcedure
    .input(z.object({
      username: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const { username, limit } = input;
      const normalizedUsername = username.toLowerCase();

      const seedRows = await db.execute(sql`
        SELECT embedding, profile_data as "profileData"
        FROM developer_profile_cache
        WHERE username = ${normalizedUsername}
          AND embedding IS NOT NULL
        ORDER BY version DESC
        LIMIT 1
      `) as unknown as Array<{ embedding: string; profileData: DeveloperProfile }>;

      if (seedRows.length === 0) {
        return { users: [], seed: username, hasEmbedding: false };
      }

      const seedEmbedding = seedRows[0].embedding;

      const similar = await db.execute(sql`
        SELECT
          p.username,
          p.profile_data as "profileData",
          1 - (p.embedding <=> ${seedEmbedding}::vector) as similarity
        FROM developer_profile_cache p
        INNER JOIN (
          SELECT username, MAX(version) as max_version
          FROM developer_profile_cache
          GROUP BY username
        ) latest ON p.username = latest.username AND p.version = latest.max_version
        WHERE p.embedding IS NOT NULL
          AND p.username != ${normalizedUsername}
        ORDER BY p.embedding <=> ${seedEmbedding}::vector
        LIMIT ${limit}
      `) as unknown as Array<{
        username: string;
        profileData: DeveloperProfile;
        similarity: number;
      }>;

      const users = similar.map(row => {
        const profile = row.profileData;
        const avgScore = profile.skillAssessment?.length
          ? Math.round((profile.skillAssessment.reduce((acc, s) => acc + s.score, 0) / profile.skillAssessment.length) * 10)
          : null;

        return {
          username: row.username,
          avatar: `https://avatars.githubusercontent.com/${row.username}`,
          summary: profile.summary || null,
          archetype: profile.developerArchetype || null,
          score: avgScore,
          similarity: Math.round(Number(row.similarity) * 100),
          topSkills: (profile.skillAssessment || []).slice(0, 3).map(s => s.metric),
        };
      });

      return { users, seed: username, hasEmbedding: true };
    }),

  /**
   * All GG profiles for Explore All mode.
   */
  getAllGGProfileNodes: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(200),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 200;

      const profiles = await db.execute(sql`
        SELECT
          p.username,
          p.profile_data as "profileData",
          p.updated_at as "updatedAt"
        FROM developer_profile_cache p
        INNER JOIN (
          SELECT username, MAX(version) as max_version
          FROM developer_profile_cache
          GROUP BY username
        ) latest ON p.username = latest.username AND p.version = latest.max_version
        WHERE p.profile_data IS NOT NULL
        ORDER BY p.updated_at DESC
        LIMIT ${limit}
      `) as unknown as Array<{
        username: string;
        profileData: DeveloperProfile;
        updatedAt: string;
      }>;

      return profiles.map(row => {
        const profile = row.profileData;
        const avgScore = profile.skillAssessment?.length
          ? Math.round((profile.skillAssessment.reduce((acc, s) => acc + s.score, 0) / profile.skillAssessment.length) * 10)
          : null;

        return {
          username: row.username,
          avatar: `https://avatars.githubusercontent.com/${row.username}`,
          summary: profile.summary || null,
          archetype: profile.developerArchetype || null,
          score: avgScore,
          topSkills: (profile.skillAssessment || []).slice(0, 5).map(s => s.metric),
          updatedAt: row.updatedAt,
        };
      });
    }),

  /**
   * Expand a single node — fetch their following with enrichment.
   */
  getNetworkUsers: protectedProcedure
    .input(z.object({
      username: z.string().min(1),
      type: z.enum(['followers', 'following']).default('following'),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const cached = await getCachedNetwork(input.username);
      if (cached) {
        console.log(`[discover:expand] cache HIT for ${input.username}`);
        return { users: cached.users, seed: input.username, type: input.type };
      }

      const githubService = await createGitHubServiceForUserOperations(ctx.session);
      const octokit = githubService['octokit'];

      const { data } = await octokit.users[input.type === 'followers' ? 'listFollowersForUser' : 'listFollowingForUser']({
        username: input.username,
        per_page: input.limit,
      });

      const logins = data.map((u: { login: string }) => u.login);
      const [userDetails, ggProfiles] = await Promise.all([
        batchGetUserDetails(octokit, logins),
        getGGProfiles(logins),
      ]);

      const users = data.map((u: { login: string; avatar_url: string }) => {
        const details = userDetails.get(u.login.toLowerCase());
        return {
          username: u.login,
          avatar: u.avatar_url,
          name: details?.name || null,
          bio: details?.bio || null,
          publicRepos: details?.repositories?.totalCount || 0,
          followers: details?.followers?.totalCount || 0,
          following: details?.following?.totalCount || 0,
          isFollower: false,
          isFollowing: true,
          isMutual: false,
          hasGGProfile: ggProfiles.has(u.login.toLowerCase()),
        };
      }).sort((a, b) => b.followers - a.followers);

      return { users, seed: input.username, type: input.type };
    }),
});
