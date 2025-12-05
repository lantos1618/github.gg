import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { DeveloperProfile } from '@/lib/types/profile';

export async function getProfileData(username: string) {
  const normalizedUsername = username.toLowerCase();

  // Find the most recent cached profile for this username (latest version)
  // Note: We order by version DESC to be consistent with other profile queries
  // and to ensure we always get the newest profile even if timestamps are slightly off
  const cached = await db
    .select()
    .from(developerProfileCache)
    .where(eq(developerProfileCache.username, normalizedUsername))
    .orderBy(desc(developerProfileCache.version))
    .limit(1);

  if (cached.length > 0) {
    const profile = cached[0];
    const isStale = new Date().getTime() - profile.updatedAt.getTime() > 7 * 24 * 60 * 60 * 1000; // 7 days
    return {
      profile: profile.profileData as DeveloperProfile,
      cached: true,
      stale: isStale,
      lastUpdated: profile.updatedAt,
    };
  }

  return {
    profile: null,
    cached: false,
    stale: false,
    lastUpdated: null,
  };
}

