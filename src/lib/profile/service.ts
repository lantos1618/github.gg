import { db } from '@/db';
import { developerProfileCache, developerEmails, user } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { DeveloperProfile } from '@/lib/types/profile';

/** Look up cached email from DB only (no scraping). */
async function getCachedEmail(normalizedUsername: string): Promise<string | null> {
  // Check registered users first
  const registeredUser = await db.query.user.findFirst({
    where: eq(user.name, normalizedUsername),
  });
  if (registeredUser?.email) return registeredUser.email;

  // Check cached developer emails
  const cached = await db.query.developerEmails.findFirst({
    where: eq(developerEmails.username, normalizedUsername),
  });
  return cached?.email ?? null;
}

export async function getProfileData(username: string) {
  const normalizedUsername = username.toLowerCase();

  // Fetch profile + cached email in parallel (both are fast DB queries)
  const [profileResult, email] = await Promise.all([
    db
      .select()
      .from(developerProfileCache)
      .where(eq(developerProfileCache.username, normalizedUsername))
      .orderBy(desc(developerProfileCache.version))
      .limit(1),
    getCachedEmail(normalizedUsername),
  ]);

  if (profileResult.length > 0) {
    const profile = profileResult[0];
    const isStale = new Date().getTime() - profile.updatedAt.getTime() > 7 * 24 * 60 * 60 * 1000; // 7 days
    return {
      profile: profile.profileData as DeveloperProfile,
      cached: true,
      stale: isStale,
      lastUpdated: profile.updatedAt,
      email,
    };
  }

  return {
    profile: null,
    cached: false,
    stale: false,
    lastUpdated: null,
    email,
  };
}

