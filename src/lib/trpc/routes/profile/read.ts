import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache, tokenUsage, user } from '@/db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getProfileData } from '@/lib/profile/service';
import type { DeveloperProfile } from '@/lib/types/profile';

export const profileReadRouter = router({
  // Returns the cached profile if present (used by the analyze button to
  // decide whether to show "Generate" vs "Regenerate"). Despite the legacy
  // name `generateProfile`, this is a read-only query.
  generateProfile: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
      includeCodeAnalysis: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      const normalizedUsername = input.username.toLowerCase();

      const cached = await db
        .select()
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername))
        .limit(1);

      if (cached.length > 0) {
        const profile = cached[0];
        const isStale = new Date().getTime() - profile.updatedAt.getTime() > 7 * 24 * 60 * 60 * 1000;
        return {
          profile: profile.profileData,
          cached: true,
          stale: isStale,
          lastUpdated: profile.updatedAt,
        };
      }

      return { profile: null, cached: false, stale: false, lastUpdated: null };
    }),

  publicGetProfile: publicProcedure
    .input(z.object({ username: z.string().min(1, 'Username is required') }))
    .query(async ({ input }): Promise<{ profile: DeveloperProfile | null, cached: boolean, stale: boolean, lastUpdated: Date | null }> => {
      return getProfileData(input.username);
    }),

  getProfileVersions: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const normalizedUsername = input.username.toLowerCase();
      return db
        .select({ version: developerProfileCache.version, updatedAt: developerProfileCache.updatedAt })
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername))
        .orderBy(desc(developerProfileCache.version));
    }),

  getProfileByVersion: publicProcedure
    .input(z.object({ username: z.string(), version: z.number() }))
    .query(async ({ input }) => {
      const normalizedUsername = input.username.toLowerCase();
      const result = await db
        .select()
        .from(developerProfileCache)
        .where(
          and(
            eq(developerProfileCache.username, normalizedUsername),
            eq(developerProfileCache.version, input.version)
          )
        )
        .limit(1);
      return result[0] || null;
    }),

  getAnalyzedProfileCount: publicProcedure.query(async () => {
    const result = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${developerProfileCache.username})` })
      .from(developerProfileCache);
    return result[0]?.count ?? 0;
  }),

  // Latest profile per username, projected down to listing fields only
  // (~6KB → ~200B per row by extracting select JSONB keys server-side).
  getAllAnalyzedProfiles: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const maxVersions = db
        .select({
          username: developerProfileCache.username,
          maxVersion: sql<number>`MAX(${developerProfileCache.version})`.as('max_version'),
        })
        .from(developerProfileCache)
        .groupBy(developerProfileCache.username)
        .as('max_versions');

      const profiles = await db
        .select({
          username: developerProfileCache.username,
          profileData: sql<Record<string, unknown>>`jsonb_build_object(
            'summary', ${developerProfileCache.profileData}->'summary',
            'skillAssessment', ${developerProfileCache.profileData}->'skillAssessment',
            'developerArchetype', ${developerProfileCache.profileData}->'developerArchetype',
            'profileConfidence', ${developerProfileCache.profileData}->'profileConfidence'
          )`,
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
        .orderBy(desc(developerProfileCache.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      if (profiles.length === 0) return [];

      const lowercaseUsernames = profiles.map(p => p.username.toLowerCase());
      const users = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(sql`LOWER(${user.name})`, lowercaseUsernames));

      const usernameToUserIdMap = new Map(users.map(u => [u.name?.toLowerCase(), u.id]));

      const userIds = Array.from(usernameToUserIdMap.values()).filter((v): v is string => !!v);
      let tokenUsageByUserId: Array<{ userId: string; totalTokens: number }> = [];
      if (userIds.length > 0) {
        tokenUsageByUserId = await db
          .select({
            userId: tokenUsage.userId,
            totalTokens: sql<number>`SUM(${tokenUsage.totalTokens})`,
          })
          .from(tokenUsage)
          .where(inArray(tokenUsage.userId, userIds))
          .groupBy(tokenUsage.userId);
      }

      const tokenMap = new Map(tokenUsageByUserId.map(t => [t.userId, Number(t.totalTokens)]));

      return profiles.map(profile => {
        const userId = usernameToUserIdMap.get(profile.username);
        return {
          ...profile,
          totalTokens: userId ? (tokenMap.get(userId) || 0) : 0,
        };
      }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }),
});
