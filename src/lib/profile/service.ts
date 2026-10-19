import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { DeveloperProfile } from '@/lib/types/profile';
import type { BetterAuthSession } from '@/lib/github/types';
import { GitHubAuthFactory } from '@/lib/github/auth-factory';
import { filterCurrentlyPublicProfiles } from './public-provenance';

/** Recheck GitHub identity before returning a profile's private email. */
export async function isCurrentGitHubProfileOwner(
  session: BetterAuthSession | null,
  username: string
): Promise<boolean> {
  if (!session?.user?.id) return false;
  const oauthOctokit = await GitHubAuthFactory.createWithOAuth(session);
  if (!oauthOctokit) return false;
  try {
    const { data } = await oauthOctokit.request('GET /user');
    return data.login.toLowerCase() === username.toLowerCase();
  } catch {
    return false;
  }
}

export async function getProfileData(username: string) {
  const normalizedUsername = username.toLowerCase();

  const profileResult = await db
    .select()
    .from(developerProfileCache)
    .where(eq(developerProfileCache.username, normalizedUsername))
    .orderBy(desc(developerProfileCache.version))
    .limit(1);

  const publicProfiles = await filterCurrentlyPublicProfiles(profileResult);
  if (publicProfiles.length > 0) {
    const profile = publicProfiles[0];
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
