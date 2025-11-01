import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache, tokenUsage, user, developerEmails } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { generateDeveloperProfile } from '@/lib/ai/developer-profile';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForUserOperations, createPublicGitHubService } from '@/lib/github';
import type { DeveloperProfile } from '@/lib/types/profile';
import { findAndStoreDeveloperEmail } from '@/lib/ai/developer-profile';
import { Octokit } from '@octokit/rest';

export const profileRouter = router({
  getUserRepositories: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input, ctx }) => {
      const githubService = await createGitHubServiceForUserOperations(ctx.session);
      const repos = await githubService.getUserRepositories(input.username);

      // Return non-fork repos with essential info
      return repos
        .filter(repo => !repo.fork)
        .map(repo => ({
          name: repo.name,
          description: repo.description || null,
          language: repo.language || null,
          stargazersCount: repo.stargazersCount,
          forksCount: repo.forksCount,
          fork: false, // Already filtered out forks above
        }));
    }),

  getDeveloperEmail: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const { username } = input;
      const normalizedUsername = username.toLowerCase();

      // 1. Check if the user is registered on our platform by username
      const registeredUser = await db.query.user.findFirst({
        where: eq(user.name, normalizedUsername),
      });
      if (registeredUser?.email) {
        return { email: registeredUser.email, source: 'database' };
      }

      // 2. Check our cached developer emails table
      const cachedEmail = await db.query.developerEmails.findFirst({
        where: eq(developerEmails.username, normalizedUsername),
      });
      if (cachedEmail?.email) {
        return { email: cachedEmail.email, source: 'cache' };
      }

      // 3. If not found, scan public GitHub commits as a fallback
      try {
        const publicGithubService = createPublicGitHubService();
        const repos = await publicGithubService.getUserRepositories(username);
        
        if (!repos || repos.length === 0) {
          return { email: null, source: 'no_repos' };
        }
        
        // Scan top 10 repos to keep it fast
        const topRepos = repos.slice(0, 10).map(r => ({ name: r.name }));
        
        // Create a dedicated Octokit instance for commit scanning
        const octokit = new Octokit({ auth: process.env.GITHUB_PUBLIC_API_KEY! });
        const foundEmail = await findAndStoreDeveloperEmail(octokit, username, topRepos);
        
        return { email: foundEmail, source: foundEmail ? 'github_scan' : 'not_found' };
      } catch (error) {
        console.error(`Failed to find email for ${username}:`, error);
        return { email: null, source: 'error' };
      }
    }),

  generateProfile: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
      includeCodeAnalysis: z.boolean().optional().default(false), // New option for deeper analysis
    }))
    .query(async ({ input }) => {
      const { username } = input;
      const normalizedUsername = username.toLowerCase();

      // Check for cached profile
      const cached = await db
        .select()
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername))
        .limit(1);

      if (cached.length > 0) {
        const profile = cached[0];
        // Consider stale after 7 days instead of 24 hours
        const isStale = new Date().getTime() - profile.updatedAt.getTime() > 7 * 24 * 60 * 60 * 1000; // 7 days
        
        return {
          profile: profile.profileData,
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
    }),

  // Public endpoint: anyone can fetch cached developer profile for a username
  publicGetProfile: publicProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
    }))
    .query(async ({ input }): Promise<{ profile: DeveloperProfile | null, cached: boolean, stale: boolean, lastUpdated: Date | null }> => {
      const { username } = input;
      const normalizedUsername = username.toLowerCase();

      // Find the most recent cached profile for this username (latest updatedAt)
      const cached = await db
        .select()
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername))
        .orderBy(desc(developerProfileCache.updatedAt))
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
    }),

  generateProfileMutation: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
      includeCodeAnalysis: z.boolean().optional().default(false),
      selectedRepos: z.array(z.string()).optional(), // User-selected repo names
    }))
    .subscription(async function* ({ input, ctx }) {
      try {
        yield { type: 'progress', progress: 0, message: 'Starting profile generation...' };

        const { username } = input;
        const normalizedUsername = username.toLowerCase();

        // Check for active subscription
        const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
        if (!subscription || subscription.status !== 'active') {
          yield { type: 'error', message: 'Active subscription required for AI features' };
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Active subscription required for AI features'
          });
        }

        // Get appropriate API key
        const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
        if (!keyInfo) {
          yield { type: 'error', message: 'Please add your Gemini API key in settings to use this feature' };
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Please add your Gemini API key in settings to use this feature'
          });
        }

        // Check generation limits for BYOK users
        if (plan === 'byok') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayUsage = await db
            .select()
            .from(tokenUsage)
            .where(
              and(
                eq(tokenUsage.userId, ctx.user.id),
                eq(tokenUsage.feature, 'profile'),
                gte(tokenUsage.createdAt, today)
              )
            );

          if (todayUsage.length >= 5) {
            yield { type: 'error', message: 'Daily limit of 5 profile generations reached. Upgrade to Pro for unlimited generations.' };
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Daily limit of 5 profile generations reached. Upgrade to Pro for unlimited generations.'
            });
          }
        }

        yield { type: 'progress', progress: 10, message: `Fetching repositories for ${username}...` };

        // Fetch user repositories
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const repos = await githubService.getUserRepositories(username);

        let smartSortedRepos;

        // If user provided specific repos, use those
        if (input.selectedRepos && input.selectedRepos.length > 0) {
          console.log(`🎯 Using ${input.selectedRepos.length} user-selected repositories`);
          smartSortedRepos = repos.filter(repo =>
            input.selectedRepos!.includes(repo.name) && !repo.fork
          );
          // Maintain user's selection order if possible, otherwise sort by stars
          smartSortedRepos.sort((a, b) => {
            const aIndex = input.selectedRepos!.indexOf(a.name);
            const bIndex = input.selectedRepos!.indexOf(b.name);
            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex; // Keep user's order
            }
            return (b.stargazersCount || 0) - (a.stargazersCount || 0);
          });
        } else {
          // Auto-select: prioritize by stars, forks, and description quality
          smartSortedRepos = repos
            .filter(repo => !repo.fork)
            .sort((a, b) => {
              // Primary: stars (weighted heavily)
              const starScore = (b.stargazersCount || 0) - (a.stargazersCount || 0);
              if (Math.abs(starScore) > 5) return starScore;

              // Secondary: forks (indicates community interest)
              const forkScore = (b.forksCount || 0) - (a.forksCount || 0);
              if (Math.abs(forkScore) > 2) return forkScore;

              // Tertiary: description length (indicates project maturity)
              return (b.description?.length || 0) - (a.description?.length || 0);
            })
            .slice(0, 15); // Top 15 repos for auto-selection
        }

        console.log(`🎯 Smart repo selection: ${smartSortedRepos.length} repos selected from ${repos.length} total`);
        smartSortedRepos.slice(0, 5).forEach((repo, i) => {
          console.log(`  ${i + 1}. ${repo.name} (⭐${repo.stargazersCount || 0}, 🍴${repo.forksCount || 0})`);
        });

        const repoFiles: Array<{
          repoName: string;
          files: Array<{ path: string; content: string }>;
        }> = [];

        // Always fetch files and generate scorecards for better profile quality
        if (input.includeCodeAnalysis && smartSortedRepos.length > 0) {
          const topRepos = smartSortedRepos.slice(0, 5); // Analyze top 5 repos
          console.log(`📁 Fetching files for ${topRepos.length} repositories in parallel...`);

          const fileFetchPromises = topRepos.map(async (repo) => {
            try {
              // Fetch key files from the repository
              const files = await githubService.getRepositoryFiles(username, repo.name, 'main');

              // Filter for important files (source code, configs, docs)
              const importantFiles = files.files.filter((file: { path: string; size: number }) =>
                !file.path.includes('node_modules') &&
                !file.path.includes('.git') &&
                !file.path.includes('dist') &&
                !file.path.includes('build') &&
                !file.path.includes('.next') &&
                file.size < 100000 && // Skip very large files
                (file.path.endsWith('.ts') ||
                 file.path.endsWith('.tsx') ||
                 file.path.endsWith('.js') ||
                 file.path.endsWith('.jsx') ||
                 file.path.endsWith('.py') ||
                 file.path.endsWith('.java') ||
                 file.path.endsWith('.go') ||
                 file.path.endsWith('.rs') ||
                 file.path.endsWith('.md') ||
                 file.path.endsWith('package.json') ||
                 file.path.endsWith('README.md'))
              ).slice(0, 10); // Limit to 10 files per repo

              // Fetch file contents
              const fileContents = await Promise.all(
                importantFiles.map(async (file: { path: string; size: number }) => {
                  try {
                    // Use the octokit directly to get file content
                    const response = await githubService['octokit'].repos.getContent({
                      owner: username,
                      repo: repo.name,
                      path: file.path,
                    });

                    if (Array.isArray(response.data)) {
                      return null; // Directory, skip
                    }

                    // Check if it's a file with content
                    if (response.data.type === 'file' && 'content' in response.data) {
                      const fileData = response.data as { content: string };
                      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                      return { path: file.path, content };
                    }

                    return null; // Not a file or no content
                  } catch (error) {
                    console.warn(`Failed to fetch ${file.path}:`, error);
                    return null;
                  }
                })
              );

              const validFiles = fileContents.filter(Boolean) as Array<{ path: string; content: string }>;

              if (validFiles.length > 0) {
                return {
                  repoName: repo.name,
                  files: validFiles,
                };
              }
              return null;
            } catch (error) {
              // Only log if it's not a 404 (expected for some repos)
              if (error instanceof Error && !error.message.includes('404')) {
                console.warn(`Failed to analyze ${repo.name}:`, error.message);
              }
              return null;
            }
          });

          // Wait for all file fetching to complete
          const fileResults = await Promise.all(fileFetchPromises);
          fileResults.forEach(result => {
            if (result) {
              repoFiles.push(result);
            }
          });
        }

        console.log(`🎯 Generating profile for ${username} with ${repoFiles.length} analyzed repos`);

        // Generate developer profile with optional code analysis
        const result = await generateDeveloperProfile({
          username,
          repos: smartSortedRepos,
          repoFiles: input.includeCodeAnalysis ? repoFiles : undefined,
          userId: ctx.user.id
        });

        console.log(`✅ Profile generated successfully for ${username}`);

        yield { type: 'progress', progress: 80, message: 'Profile generated, saving results...' };

        // Get next version number
        const maxVersionResult = await db
          .select({ max: sql<number | null>`COALESCE(MAX(version), 0)` })
          .from(developerProfileCache)
          .where(eq(developerProfileCache.username, normalizedUsername));
        const nextVersion = (maxVersionResult[0]?.max ?? 0) + 1;

        console.log(`📝 Saving profile version ${nextVersion} for ${username}`);

        // Cache the result with proper versioning
        await db
          .insert(developerProfileCache)
          .values({
            username: normalizedUsername,
            version: nextVersion,
            profileData: result.profile,
            updatedAt: new Date(),
          });

        // Log token usage
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'profile',
          repoOwner: username,
          repoName: null,
          model: 'gemini-2.5-pro',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });

        // Extract and email developer using Resend
        try {
          console.log(`📧 Attempting to find email for ${username}...`);
          const email = await findAndStoreDeveloperEmail(githubService['octokit'], username, smartSortedRepos);

          if (email) {
            console.log(`✉️  Found email: ${email}`);

            // Import the new email function
            const { sendProfileAnalysisEmail } = await import('@/lib/email/resend');

            // Get analyzer's username
            const analyzerGithubUsername = ctx.user.name || 'Someone';

            // Calculate average scorecard score if available
            const scorecardScores = result.profile.topRepos
              ?.map(repo => repo.significanceScore)
              .filter(Boolean) || [];
            const avgScore = scorecardScores.length > 0
              ? Math.round(scorecardScores.reduce((a, b) => a + b, 0) / scorecardScores.length * 10)
              : undefined;

            console.log(`📤 Sending email to ${email}...`);

            // Send professional email notification
            await sendProfileAnalysisEmail({
              recipientEmail: email,
              recipientUsername: username,
              analyzerUsername: analyzerGithubUsername,
              analyzerEmail: ctx.user.email,
              profileData: {
                summary: result.profile.summary || 'Your profile has been analyzed!',
                overallScore: avgScore,
                topSkills: result.profile.techStack?.slice(0, 5).map(item => item.name) || [],
                suggestions: result.profile.suggestions || [],
              },
            });

            console.log(`✅ Successfully sent profile analysis email to ${email}`);
          } else {
            console.log(`⚠️  No email found for ${username} in their commits`);
          }
        } catch (e) {
          console.error('❌ Failed to extract/send developer email:', e);
        }

        yield {
          type: 'complete',
          data: {
            profile: result.profile,
            cached: false,
            stale: false,
            lastUpdated: new Date(),
          },
        };
      } catch (error) {
        console.error('Error generating developer profile:', error);
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate developer profile';
        yield { type: 'error', message: userFriendlyMessage };
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: userFriendlyMessage
        });
      }
    }),

  clearProfileCache: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
    }))
    .mutation(async ({ input }) => {
      const { username } = input;
      const normalizedUsername = username.toLowerCase();

      await db
        .delete(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername));

      return { success: true };
    }),

  getProfileVersions: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const normalizedUsername = input.username.toLowerCase();
      const result = await db
        .select({ version: developerProfileCache.version, updatedAt: developerProfileCache.updatedAt })
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername))
        .orderBy(desc(developerProfileCache.version));
      // Return as array for compatibility with existing UI
      return result;
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

  // Get all analyzed profiles (latest version only per username)
  getAllAnalyzedProfiles: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      // Get all profiles with their latest version
      const profiles = await db
        .select({
          username: developerProfileCache.username,
          profileData: developerProfileCache.profileData,
          updatedAt: developerProfileCache.updatedAt,
          version: developerProfileCache.version,
        })
        .from(developerProfileCache)
        .orderBy(desc(developerProfileCache.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      // Group by username and take the latest version
      const latestProfiles = new Map<string, typeof profiles[0]>();
      for (const profile of profiles) {
        const existing = latestProfiles.get(profile.username);
        if (!existing || profile.version > existing.version) {
          latestProfiles.set(profile.username, profile);
        }
      }

      const profilesArray = Array.from(latestProfiles.values());

      // Early return if no profiles
      if (profilesArray.length === 0) {
        return [];
      }

      // Get all userIds for the usernames in profiles
      const usernames = profilesArray.map(p => p.username);
      const users = await db
        .select({
          id: user.id,
          name: user.name,
        })
        .from(user)
        .where(sql`LOWER(${user.name}) IN (${sql.raw(usernames.map(u => `'${u.toLowerCase()}'`).join(','))})`);

      // Create a map of username -> userId
      const usernameToUserIdMap = new Map(
        users.map(u => [u.name?.toLowerCase(), u.id])
      );

      // Get total token usage by userId (across all features)
      const userIds = Array.from(usernameToUserIdMap.values());
      let tokenUsageByUserId: Array<{ userId: string; totalTokens: number }> = [];

      if (userIds.length > 0) {
        tokenUsageByUserId = await db
          .select({
            userId: tokenUsage.userId,
            totalTokens: sql<number>`SUM(${tokenUsage.totalTokens})`,
          })
          .from(tokenUsage)
          .where(sql`${tokenUsage.userId} IN (${sql.raw(userIds.map(id => `'${id}'`).join(','))})`)
          .groupBy(tokenUsage.userId);
      }

      // Create a map of userId -> total tokens
      const tokenMap = new Map(
        tokenUsageByUserId.map(t => [t.userId, Number(t.totalTokens)])
      );

      // Add token usage to profiles
      const profilesWithTokens = profilesArray.map(profile => {
        const userId = usernameToUserIdMap.get(profile.username);
        return {
          ...profile,
          totalTokens: userId ? (tokenMap.get(userId) || 0) : 0,
        };
      });

      return profilesWithTokens.sort((a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    }),
}); 