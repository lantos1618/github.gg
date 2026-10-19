import { z } from 'zod';
import { router } from '@/lib/trpc/trpc';
import { adminProcedure } from '@/lib/trpc/admin';
import { db } from '@/db';
import { tokenUsage, developerProfileCache } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { generateDeveloperProfileStreaming } from '@/lib/ai/developer-profile';
import { getPlatformGeminiApiKey } from '@/lib/ai/models';
import { createGitHubServiceForRepo, createGitHubServiceForUserOperations } from '@/lib/github';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';
import { areRepositoriesCurrentlyPublic, withVerifiedPublicSources } from '@/lib/profile/public-provenance';

export const adminProfileRouter = router({
  // Admin Mass Generate Profile Subscription
  generateProfile: adminProcedure
    .input(z.object({
      username: z.string(),
      targetUserId: z.string().optional(), // Optional: if we want to attribute to a user
    }))
    .subscription(async function* ({ input, ctx }) {
      const { username, targetUserId } = input;
      const normalizedUsername = username.toLowerCase();

      try {
        yield { type: 'progress', progress: 0, message: `Starting admin generation for ${username}...` };

        // Use Admin's session for GitHub access (Admin should have broad access or access to public repos)
        // Ideally we'd use a system token, but user token works for public repos.
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const repos = await githubService.getUserRepositories(username);

        // Smart Sort Repos (Top 15)
        const smartSortedRepos = repos
          .filter(repo => !repo.fork)
          .sort((a, b) => {
            const starScore = (b.stargazersCount || 0) - (a.stargazersCount || 0);
            if (Math.abs(starScore) > 5) return starScore;
            return (b.description?.length || 0) - (a.description?.length || 0);
          })
          .slice(0, 15);

        const profileSourceRepos = smartSortedRepos.map(repo => ({ owner: repo.owner, name: repo.name }));
        if (!(await areRepositoriesCurrentlyPublic(profileSourceRepos))) {
          throw new Error('Repository visibility could not be verified as public. Please retry.');
        }

        yield { type: 'progress', progress: 10, message: `Found ${smartSortedRepos.length} repositories` };

        // Fetch files for top 5 repos for deep analysis
        const repoFiles: Array<{
          repoName: string;
          owner: string;
          defaultBranch: string;
          files: Array<{ path: string; content: string }>;
        }> = [];

        const topRepos = smartSortedRepos.slice(0, 5);

        if (topRepos.length > 0) {
          yield { type: 'progress', progress: 15, message: 'Fetching repository files...' };

          const fileFetchPromises = topRepos.map(async (repo) => {
            const currentInfo = await getAccessibleRepositoryInfo(repo.owner, repo.name, null);
            if (!currentInfo || currentInfo.private) throw new Error(`Repository visibility changed for ${repo.owner}/${repo.name}`);
            try {
              const publicService = await createGitHubServiceForRepo(repo.owner, repo.name, null);
              const files = await publicService.getRepositoryFiles(repo.owner, repo.name, repo.defaultBranch || 'main');
              const importantFiles = files.files.filter((file: { path: string; size: number }) =>
                !file.path.includes('node_modules') &&
                !file.path.includes('.git') &&
                file.size < 100000 &&
                (file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.js') ||
                 file.path.endsWith('.py') || file.path.endsWith('.go') || file.path.endsWith('.rs') ||
                 file.path.endsWith('package.json') || file.path.endsWith('README.md'))
              ).slice(0, 10);

              const fileContents = await Promise.all(
                importantFiles.map(async (file: { path: string; size: number }) => {
                  try {
                    const response = await publicService.octokit.repos.getContent({
                      owner: repo.owner,
                      repo: repo.name,
                      path: file.path,
                    });
                    if ('content' in response.data && !Array.isArray(response.data)) {
                      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                      return { path: file.path, content };
                    }
                    return null;
                  } catch { return null; }
                })
              );

              const validFiles = fileContents.filter(Boolean) as Array<{ path: string; content: string }>;
              if (validFiles.length > 0) return {
                repoName: repo.name,
                owner: repo.owner,
                defaultBranch: repo.defaultBranch || 'main',
                files: validFiles,
              };
              return null;
            } catch { return null; }
            finally {
              const latestInfo = await getAccessibleRepositoryInfo(repo.owner, repo.name, null);
              if (!latestInfo || latestInfo.private) throw new Error(`Repository visibility changed for ${repo.owner}/${repo.name}`);
            }
          });

          const fileResults = await Promise.all(fileFetchPromises);
          fileResults.forEach(r => { if (r) repoFiles.push(r); });
        }

        // Generate Profile
        let result;
        const generator = generateDeveloperProfileStreaming({
          apiKey: getPlatformGeminiApiKey() || '',
          username,
          repos: smartSortedRepos,
          repoFiles: repoFiles.length > 0 ? repoFiles : undefined,
          userId: targetUserId || ctx.user.id // Attribute analysis to target user or admin
        });

        for await (const update of generator) {
          if (update.type === 'progress') {
            yield { type: 'progress', progress: update.progress, message: update.message };
          } else if (update.type === 'complete') {
            result = update.result;
          }
        }

        if (!result) throw new Error("Failed to generate profile");

        if (!(await areRepositoriesCurrentlyPublic(profileSourceRepos))) {
          throw new Error('Repository visibility changed during profile generation. Please retry.');
        }
        const publicProfile = withVerifiedPublicSources(result.profile, profileSourceRepos);

        // Save Profile
        const maxVersionResult = await db
          .select({ max: sql<number | null>`COALESCE(MAX(version), 0)` })
          .from(developerProfileCache)
          .where(eq(developerProfileCache.username, normalizedUsername));
        const nextVersion = (maxVersionResult[0]?.max ?? 0) + 1;

        await db
          .insert(developerProfileCache)
          .values({
            username: normalizedUsername,
            version: nextVersion,
            profileData: publicProfile,
            updatedAt: new Date(),
          });

        // Log Token Usage (Attributed to SYSTEM/Admin)
        await db.insert(tokenUsage).values({
          userId: ctx.user.id, // Admin ID
          feature: 'admin_mass_analysis',
          repoOwner: username,
          model: 'gemini-3.1-pro-preview',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          isByok: false, // System cost
          createdAt: new Date(),
        });

        yield { type: 'complete', data: { success: true, username } };

      } catch (error) {
        console.error(`Admin generation failed for ${username}:`, error);
        yield { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
      }
    }),
});
