import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { formatEmbeddingForPg } from '@/lib/ai/embeddings';
import type { DeveloperProfile } from '@/lib/types/profile';

export const discoverRouter = router({
  /**
   * Fetch unified GitHub followers + following for a user.
   * Returns a merged set with relationship flags: isFollower, isFollowing, isMutual.
   */
  getUnifiedNetwork: protectedProcedure
    .input(z.object({
      username: z.string().min(1),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const githubService = await createGitHubServiceForUserOperations(ctx.session);
      const octokit = githubService['octokit'];

      // Fetch both followers and following in parallel
      const [{ data: followersRaw }, { data: followingRaw }] = await Promise.all([
        octokit.users.listFollowersForUser({
          username: input.username,
          per_page: input.limit,
        }),
        octokit.users.listFollowingForUser({
          username: input.username,
          per_page: input.limit,
        }),
      ]);

      // Merge into a map keyed by login
      const userMap = new Map<string, {
        login: string;
        avatar_url: string;
        isFollower: boolean;
        isFollowing: boolean;
      }>();

      for (const u of followersRaw) {
        userMap.set(u.login.toLowerCase(), {
          login: u.login,
          avatar_url: u.avatar_url,
          isFollower: true,
          isFollowing: false,
        });
      }
      for (const u of followingRaw) {
        const key = u.login.toLowerCase();
        const existing = userMap.get(key);
        if (existing) {
          existing.isFollowing = true;
        } else {
          userMap.set(key, {
            login: u.login,
            avatar_url: u.avatar_url,
            isFollower: false,
            isFollowing: true,
          });
        }
      }

      // Enrich with basic profile info in parallel
      const enriched = await Promise.all(
        Array.from(userMap.values()).map(async (u) => {
          try {
            const { data: profile } = await octokit.users.getByUsername({ username: u.login });
            const existingProfile = await db.query.developerProfileCache.findFirst({
              where: eq(developerProfileCache.username, u.login.toLowerCase()),
            });
            return {
              username: u.login,
              avatar: u.avatar_url,
              name: profile.name,
              bio: profile.bio,
              publicRepos: profile.public_repos,
              followers: profile.followers,
              following: profile.following,
              isFollower: u.isFollower,
              isFollowing: u.isFollowing,
              isMutual: u.isFollower && u.isFollowing,
              hasGGProfile: !!existingProfile,
            };
          } catch {
            return {
              username: u.login,
              avatar: u.avatar_url,
              name: null,
              bio: null,
              publicRepos: 0,
              followers: 0,
              following: 0,
              isFollower: u.isFollower,
              isFollowing: u.isFollowing,
              isMutual: u.isFollower && u.isFollowing,
              hasGGProfile: false,
            };
          }
        })
      );

      enriched.sort((a, b) => b.followers - a.followers);

      // Get seed user's avatar from the first API response or fetch directly
      const seedFollower = followersRaw.find(u => u.login.toLowerCase() === input.username.toLowerCase());
      const seedFollowing = followingRaw.find(u => u.login.toLowerCase() === input.username.toLowerCase());
      let seedAvatar = seedFollower?.avatar_url || seedFollowing?.avatar_url;
      if (!seedAvatar) {
        try {
          const { data: seedProfile } = await octokit.users.getByUsername({ username: input.username });
          seedAvatar = seedProfile.avatar_url;
        } catch {
          seedAvatar = `https://github.com/${input.username}.png?size=128`;
        }
      }

      return {
        users: enriched,
        seed: input.username,
        seedAvatar,
        followerCount: followersRaw.length,
        followingCount: followingRaw.length,
      };
    }),

  /**
   * Find developers semantically similar to a given username using pgvector.
   * Leverages existing embeddings in developer_profile_cache.
   */
  getSimilarDevelopers: publicProcedure
    .input(z.object({
      username: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const { username, limit } = input;
      const normalizedUsername = username.toLowerCase();

      // Get the seed user's embedding
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

      // Vector similarity search — exclude the seed user
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
   * Return all GG profiles as lightweight nodes for the graph.
   * Includes 2D position hints derived from embeddings via PCA/t-SNE on the client.
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

  // Keep the old endpoint for backwards compat during transition
  getNetworkUsers: protectedProcedure
    .input(z.object({
      username: z.string().min(1),
      type: z.enum(['followers', 'following']).default('following'),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const githubService = await createGitHubServiceForUserOperations(ctx.session);
      const octokit = githubService['octokit'];

      const { data } = await octokit.users[input.type === 'followers' ? 'listFollowersForUser' : 'listFollowingForUser']({
        username: input.username,
        per_page: input.limit,
      });

      // Enrich with basic profile info in parallel
      const enriched = await Promise.all(
        data.map(async (u: { login: string; avatar_url: string; html_url: string }) => {
          try {
            const { data: profile } = await octokit.users.getByUsername({ username: u.login });
            const existingProfile = await db.query.developerProfileCache.findFirst({
              where: eq(developerProfileCache.username, u.login.toLowerCase()),
            });
            return {
              username: u.login,
              avatar: u.avatar_url,
              name: profile.name,
              bio: profile.bio,
              publicRepos: profile.public_repos,
              followers: profile.followers,
              following: profile.following,
              hasGGProfile: !!existingProfile,
            };
          } catch {
            return {
              username: u.login,
              avatar: u.avatar_url,
              name: null,
              bio: null,
              publicRepos: 0,
              followers: 0,
              following: 0,
              hasGGProfile: false,
            };
          }
        })
      );

      enriched.sort((a, b) => b.followers - a.followers);

      return { users: enriched, seed: input.username, type: input.type };
    }),
});
