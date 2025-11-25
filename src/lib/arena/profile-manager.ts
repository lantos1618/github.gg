import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { generateDeveloperProfileStreaming } from '@/lib/ai/developer-profile';
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

  // Generate new profile - only use non-fork repos
  const repos = await githubService.getUserRepositories(username);
  if (repos.length === 0) {
    throw new Error(`${username} has no public repositories.`);
  }

  const nonForkRepos = repos.filter(r => !r.fork);
  if (nonForkRepos.length === 0) {
    throw new Error(`${username} has no original repositories (only forks).`);
  }

  let profileResult;
  // Consume the generator to get the final result
  const generator = generateDeveloperProfileStreaming({
    username,
    repos: nonForkRepos,
    userId
  });

  for await (const update of generator) {
    if (update.type === 'complete' && update.result) {
      profileResult = update.result;
    }
  }

  if (!profileResult) {
    throw new Error(`Failed to generate profile for ${username}`);
  }

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
    profileData: profileResult.profile,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: [developerProfileCache.username, developerProfileCache.version],
    set: { profileData: profileResult.profile, updatedAt: new Date() }
  });

  return profileResult.profile;
}
