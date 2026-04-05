import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createGitHubServiceForUserOperations } from '@/lib/github';

export const discoverRouter = router({
  // Fetch GitHub followers/following for a user — for talent discovery
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
