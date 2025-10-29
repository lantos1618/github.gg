import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { generateDeveloperProfile } from '@/lib/ai/developer-profile';
import type { DeveloperProfile } from '@/lib/types/profile';
import type { GitHubService } from '@/lib/github';

const PROFILE_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours

export function isProfileStale(updatedAt: Date): boolean {
  return new Date().getTime() - updatedAt.getTime() > PROFILE_STALE_TIME;
}

export async function getOrGenerateProfile(
  username: string,
  githubService: GitHubService,
  userId: string
): Promise<DeveloperProfile> {
  const normalizedUsername = username.toLowerCase();

  // Check cache first
  const existing = await db
    .select()
    .from(developerProfileCache)
    .where(eq(developerProfileCache.username, normalizedUsername))
    .limit(1);

  if (existing[0] && !isProfileStale(existing[0].updatedAt)) {
    return existing[0].profileData as DeveloperProfile;
  }

  // Generate new profile
  const repos = await githubService.getUserRepositories(username);
  if (repos.length === 0) {
    throw new Error(`${username} has no public repositories.`);
  }

  const result = await generateDeveloperProfile({
    username,
    repos,
    userId
  });

  // Get next version number
  const maxVersionResult = await db
    .select({ max: sql<number>`MAX(version)` })
    .from(developerProfileCache)
    .where(eq(developerProfileCache.username, normalizedUsername));
  const nextVersion = (maxVersionResult[0]?.max || 0) + 1;

  // Save to cache
  await db.insert(developerProfileCache).values({
    username: normalizedUsername,
    version: nextVersion,
    profileData: result.profile,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: [developerProfileCache.username, developerProfileCache.version],
    set: { profileData: result.profile, updatedAt: new Date() }
  });

  return result.profile;
}
