import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache, tokenUsage, user, developerEmails } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { generateDeveloperProfileStreaming, findAndStoreDeveloperEmail } from '@/lib/ai/developer-profile';
import { getProfileData } from '@/lib/profile/service';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForUserOperations, createPublicGitHubService } from '@/lib/github';
import type { DeveloperProfile } from '@/lib/types/profile';
import { Octokit } from '@octokit/rest';
import { handleTRPCGitHubError } from '@/lib/github/error-handler';
import { getCachedStargazerStatus, setCachedStargazerStatus } from '@/lib/rate-limit';
import { isPgErrorWithCode } from '@/lib/db/utils';
import { generateEmbedding, formatEmbeddingForPg } from '@/lib/ai/embeddings';

export const profileRouter = router({
  getUserRepositories: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
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
      } catch (error) {
        handleTRPCGitHubError(error);
      }
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
      return getProfileData(input.username);
    }),

  // Check generation status (lock + recent profile)
  checkGenerationStatus: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
    }))
    .query(async ({ input, ctx }) => {
      const { username } = input;
      const normalizedUsername = username.toLowerCase();
      const lockKey = `profile:${normalizedUsername}`;

      // Check for recent profile first
      const recentProfile = await db
        .select()
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, normalizedUsername))
        .orderBy(desc(developerProfileCache.version))
        .limit(1);

      const hasRecentProfile = recentProfile.length > 0 && 
        (new Date().getTime() - recentProfile[0].updatedAt.getTime() < 5 * 60 * 1000);

      // Check if lock exists
      const { isGenerationInProgress } = await import('@/lib/rate-limit');
      const lockExists = await isGenerationInProgress(lockKey);

      return {
        hasRecentProfile,
        profile: hasRecentProfile ? recentProfile[0].profileData : null,
        lockExists,
        canReconnect: lockExists && !hasRecentProfile, // Can reconnect if lock exists but no recent profile
      };
    }),

  generateProfileMutation: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
      includeCodeAnalysis: z.boolean().optional().default(false),
      selectedRepos: z.array(z.string()).optional(), // User-selected repo names
      forceRefreshScorecards: z.boolean().optional().default(false), // Force regenerate all scorecards
    }))
    .subscription(async function* ({ input, ctx }) {
      try {
        yield { type: 'progress', progress: 0, message: 'Starting profile generation...' };

        const { username } = input;
        const normalizedUsername = username.toLowerCase();

        // 1. Check for recently generated profile (within last 5 minutes) to prevent spam/retries
        const recentProfile = await db
          .select()
          .from(developerProfileCache)
          .where(eq(developerProfileCache.username, normalizedUsername))
          .orderBy(desc(developerProfileCache.version))
          .limit(1);

        if (recentProfile.length > 0) {
          const profile = recentProfile[0];
          const timeSinceUpdate = new Date().getTime() - profile.updatedAt.getTime();
          
          // If generated less than 5 minutes ago, return it immediately
          if (timeSinceUpdate < 5 * 60 * 1000) {
            yield { type: 'progress', progress: 100, message: 'Profile was just generated! Loading results...' };
            yield {
              type: 'complete',
              data: {
                profile: profile.profileData,
                cached: true,
                stale: false,
                lastUpdated: profile.updatedAt,
              },
            };
            return;
          }
        }

        // Check for active subscription
        const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
        
        let effectivePlan = plan;
        let isStargazerPerk = false;

        // If no active subscription, check for star credit
        if (!subscription || subscription.status !== 'active') {
          try {
            // Check cached stargazer status first to reduce GitHub API calls
            const STARGAZER_REPO = 'lantos1618/github.gg';
            let hasStarred = await getCachedStargazerStatus(ctx.user.id, STARGAZER_REPO);

            // If not cached, fetch from GitHub and cache
            if (hasStarred === null) {
              const githubService = await createGitHubServiceForUserOperations(ctx.session);
              hasStarred = await githubService.hasStarredRepo('lantos1618', 'github.gg');
              // Cache the result for 1 hour
              await setCachedStargazerStatus(ctx.user.id, STARGAZER_REPO, hasStarred);
            }

            if (hasStarred) {
              // Check monthly usage
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              
              const monthlyUsage = await db
                .select()
                .from(tokenUsage)
                .where(
                  and(
                    eq(tokenUsage.userId, ctx.user.id),
                    eq(tokenUsage.feature, 'profile'),
                    gte(tokenUsage.createdAt, oneMonthAgo)
                  )
                );
                
              // Allow 1 free analysis per month
              if (monthlyUsage.length < 1) {
                isStargazerPerk = true;
                effectivePlan = 'pro'; // Grant temporary pro access for this run
              } else {
                yield { type: 'error', message: 'You have used your 1 free monthly analysis. Upgrade to Pro for more or wait until next month.' };
                return;
              }
            } else {
               yield { type: 'error', message: 'Active subscription required. Tip: Star our repo (lantos1618/github.gg) to get 1 free analysis/month!' };
               return;
            }
          } catch (e) {
            console.error('Failed to check stargazer status:', e);
          yield { type: 'error', message: 'Active subscription required for AI features' };
          return;
          }
        }

        // Get appropriate API key
        const keyInfo = await getApiKeyForUser(ctx.user.id, effectivePlan as 'byok' | 'pro');
        if (!keyInfo) {
          yield { type: 'error', message: 'Please add your Gemini API key in settings to use this feature' };
          return;
        }

        // Check generation limits for BYOK users (if not using stargazer perk)
        if (effectivePlan === 'byok' && !isStargazerPerk) {
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
            return;
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
        // When user selects repos via Configure, analyze all of them (up to 15)
        if (input.includeCodeAnalysis && smartSortedRepos.length > 0) {
          const maxReposToAnalyze = input.selectedRepos && input.selectedRepos.length > 0 ? 15 : 5;
          const topRepos = smartSortedRepos.slice(0, maxReposToAnalyze);
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

        // Generate developer profile with optional code analysis and streaming progress
        let result;
        const generator = generateDeveloperProfileStreaming({
          username,
          repos: smartSortedRepos,
          repoFiles: input.includeCodeAnalysis ? repoFiles : undefined,
          userId: ctx.user.id,
          forceRefreshScorecards: input.forceRefreshScorecards,
        });

        for await (const update of generator) {
          if (update.type === 'progress') {
            yield { type: 'progress', progress: update.progress, message: update.message };
          } else if (update.type === 'complete') {
            result = update.result;
          }
        }

        if (!result) {
          throw new Error("Failed to generate profile");
        }

        console.log(`✅ Profile generated successfully for ${username}`);
        console.log(`📊 Profile data keys:`, result.profile ? Object.keys(result.profile) : 'null');

        yield { type: 'progress', progress: 90, message: 'Profile generated, saving results...' };

        // Validate profile data before saving
        if (!result.profile) {
          throw new Error('Generated profile is null or undefined');
        }

        // Get next version number (retry logic handles race conditions)
        let profileInserted = false;
        for (let retryCount = 0; retryCount < 3; retryCount++) {
          const maxVersionResult = await db
            .select({ max: sql<number | null>`COALESCE(MAX(version), 0)` })
            .from(developerProfileCache)
            .where(eq(developerProfileCache.username, normalizedUsername));
          const nextVersion = (maxVersionResult[0]?.max ?? 0) + 1;

          console.log(`📝 Attempting to save profile version ${nextVersion} for ${username} (attempt ${retryCount + 1})`);

          try {
            console.log(`💾 Attempting to insert profile for ${username}, version ${nextVersion}`);
            const [insertResult] = await db
              .insert(developerProfileCache)
              .values({
                username: normalizedUsername,
                version: nextVersion,
                profileData: result.profile,
                updatedAt: new Date(),
              })
              .onConflictDoNothing()
              .returning();
            
            if (insertResult) {
              console.log(`✅ Successfully inserted profile version ${nextVersion} for ${username}`);
              profileInserted = true;
              break;
            } else {
              console.warn(`⚠️ Insert returned no result (likely conflict) for ${username}, version ${nextVersion}`);
            }
          } catch (e) {
            console.error(`❌ Database insert error for ${username}, version ${nextVersion}:`, e);
            if (isPgErrorWithCode(e) && e.code === '23505') {
              console.log(`🔄 Retrying with new version due to conflict...`);
              continue; // Retry with recalculated version
            }
            throw e;
          }
        }
        if (!profileInserted) {
          console.warn(`⚠️ Failed to insert profile cache for ${normalizedUsername} after 3 retries - profile will still be returned to user`);
        }

        // Log token usage (don't fail if this errors)
        try {
          await db.insert(tokenUsage).values({
            userId: ctx.user.id,
            feature: 'profile',
            repoOwner: normalizedUsername,
            repoName: null,
            model: 'gemini-3-pro-preview',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            totalTokens: result.usage.totalTokens,
            isByok: keyInfo.isByok,
            createdAt: new Date(),
          });
        } catch (tokenError) {
          console.error('❌ Failed to log token usage (non-critical):', tokenError);
          // Don't throw - token logging is not critical
        }

        // Extract and email developer using Resend
        try {
          console.log(`📧 Attempting to find email for ${username}...`);
          const email = await findAndStoreDeveloperEmail(githubService['octokit'], username, smartSortedRepos);

          if (email) {
            console.log(`✉️  Found email: ${email}`);
            
            // Check if we've already sent an email to this user recently (prevent spam)
            const emailRecord = await db.query.developerEmails.findFirst({
              where: eq(developerEmails.email, email)
            });

            const ONE_HOUR = 60 * 60 * 1000;
            const timeSinceLastEmail = emailRecord?.lastUsedAt ? new Date().getTime() - emailRecord.lastUsedAt.getTime() : Infinity;

            if (timeSinceLastEmail < ONE_HOUR) {
              console.log(`🚫 Skipping email: Already sent one to ${email} in the last hour.`);
            } else {
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

              // Update lastUsedAt
              await db.update(developerEmails)
                .set({ lastUsedAt: new Date() })
                .where(eq(developerEmails.email, email));

              console.log(`✅ Successfully sent profile analysis email to ${email}`);
            }
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
        // Log full error details for Vercel error tracking
        const errorDetails = {
          username: input.username,
          userId: ctx.user.id,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          } : error,
        };
        
        console.error('❌ Error generating developer profile:', JSON.stringify(errorDetails, null, 2));
        
        // Log the raw error object for Vercel's error tracking
        if (error instanceof Error) {
          console.error('Error stack trace:', error.stack);
        }
        console.error('Raw error:', error);
        
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate developer profile';
        yield { type: 'error', message: userFriendlyMessage };
        
        // Re-throw with full context for Vercel to catch
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: userFriendlyMessage,
          cause: error instanceof Error ? error : undefined,
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
      // 1. Get the maximum version for each username (subquery)
      const maxVersions = db
        .select({
          username: developerProfileCache.username,
          maxVersion: sql<number>`MAX(${developerProfileCache.version})`.as('max_version')
        })
        .from(developerProfileCache)
        .groupBy(developerProfileCache.username)
        .as('max_versions');

      // 2. Join with the cache table to get the full profile for that version
      // This ensures we paginate over unique users (latest version) rather than all versions
      const profiles = await db
        .select({
          username: developerProfileCache.username,
          profileData: developerProfileCache.profileData,
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

      // No need for further deduping since we joined on max version
      const profilesArray = profiles;

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

  // Search profiles by skills, archetype, confidence - with semantic search
  searchProfiles: publicProcedure
    .input(z.object({
      skills: z.array(z.string()).optional(),
      archetypes: z.array(z.string()).optional(),
      minConfidence: z.number().min(0).max(100).optional(),
      maxConfidence: z.number().min(0).max(100).optional(),
      query: z.string().optional(), // Free text search - now uses semantic search
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const { skills, archetypes, minConfidence, maxConfidence, query, limit, offset } = input;

      let allProfiles: Array<{
        username: string;
        profileData: unknown;
        updatedAt: Date;
        version: number;
        similarityScore?: number;
      }>;

      // If there's a text query, use semantic vector search
      if (query && query.trim().length >= 2) {
        try {
          // Generate embedding for the search query
          const queryEmbedding = await generateEmbedding(`Developer search: ${query}`);
          const embeddingStr = formatEmbeddingForPg(queryEmbedding);

          // Vector similarity search
          const vectorResults = await db.execute(sql`
            SELECT
              p.username,
              p.profile_data as "profileData",
              p.updated_at as "updatedAt",
              p.version,
              1 - (p.embedding <=> ${embeddingStr}::vector) as similarity_score
            FROM developer_profile_cache p
            INNER JOIN (
              SELECT username, MAX(version) as max_version
              FROM developer_profile_cache
              GROUP BY username
            ) latest ON p.username = latest.username AND p.version = latest.max_version
            WHERE p.embedding IS NOT NULL
            ${minConfidence ? sql`AND (p.profile_data->>'profileConfidence')::int >= ${minConfidence}` : sql``}
            ${maxConfidence ? sql`AND (p.profile_data->>'profileConfidence')::int <= ${maxConfidence}` : sql``}
            ORDER BY p.embedding <=> ${embeddingStr}::vector
            LIMIT 200
          `);

          allProfiles = (vectorResults as unknown as Array<{
            username: string;
            profileData: DeveloperProfile;
            updatedAt: Date;
            version: number;
            similarity_score: number;
          }>).map(r => ({
            ...r,
            similarityScore: Number(r.similarity_score) || 0,
          }));
        } catch (error) {
          // Fallback: if vector search fails, use regular search
          console.warn('Semantic search failed, falling back to basic search:', error);
          const maxVersions = db
            .select({
              username: developerProfileCache.username,
              maxVersion: sql<number>`MAX(${developerProfileCache.version})`.as('max_version')
            })
            .from(developerProfileCache)
            .groupBy(developerProfileCache.username)
            .as('max_versions');

          allProfiles = await db
            .select({
              username: developerProfileCache.username,
              profileData: developerProfileCache.profileData,
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
            .orderBy(desc(developerProfileCache.updatedAt));
        }
      } else {
        // No query - just get all profiles with basic ordering
        const maxVersions = db
          .select({
            username: developerProfileCache.username,
            maxVersion: sql<number>`MAX(${developerProfileCache.version})`.as('max_version')
          })
          .from(developerProfileCache)
          .groupBy(developerProfileCache.username)
          .as('max_versions');

        allProfiles = await db
          .select({
            username: developerProfileCache.username,
            profileData: developerProfileCache.profileData,
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
          .orderBy(desc(developerProfileCache.updatedAt));
      }

      // Filter in memory for structured filters
      let filtered = allProfiles.filter(profile => {
        const data = profile.profileData as DeveloperProfile;
        if (!data) return false;

        // Filter by archetype
        if (archetypes && archetypes.length > 0) {
          if (!data.developerArchetype || !archetypes.includes(data.developerArchetype)) {
            return false;
          }
        }

        // Filter by confidence (only apply if not already filtered in SQL)
        if (!query || !query.trim()) {
          if (minConfidence !== undefined && (data.profileConfidence ?? 0) < minConfidence) {
            return false;
          }
          if (maxConfidence !== undefined && (data.profileConfidence ?? 100) > maxConfidence) {
            return false;
          }
        }

        // Filter by skills (fuzzy match using includes)
        if (skills && skills.length > 0) {
          const profileSkills = [
            ...(data.skillAssessment?.map(s => s.metric.toLowerCase()) || []),
            ...(data.techStack?.map(t => t.name.toLowerCase()) || []),
          ];
          const hasMatchingSkill = skills.some(skill => {
            const skillLower = skill.toLowerCase();
            return profileSkills.some(ps =>
              ps.includes(skillLower) || skillLower.includes(ps)
            );
          });
          if (!hasMatchingSkill) return false;
        }

        return true;
      });

      // Calculate match score for ranking
      const scored = filtered.map(profile => {
        const data = profile.profileData as DeveloperProfile;
        let score = 0;

        // If we have similarity score from vector search, use it as primary signal
        if (profile.similarityScore !== undefined) {
          score += profile.similarityScore * 100; // Scale similarity to 0-100
        }

        // Base score from confidence
        score += (data.profileConfidence ?? 50) / 4;

        // Bonus for matching skills
        if (skills && skills.length > 0) {
          const profileSkills = [
            ...(data.skillAssessment?.map(s => ({ name: s.metric.toLowerCase(), score: s.score })) || []),
          ];
          skills.forEach(skill => {
            const skillLower = skill.toLowerCase();
            const match = profileSkills.find(ps =>
              ps.name.includes(skillLower) || skillLower.includes(ps.name)
            );
            if (match) {
              score += match.score * 2; // Weight skill matches
            }
          });
        }

        // Bonus for production builders
        if (data.developerArchetype === 'Production Builder') {
          score += 5;
        }

        return { ...profile, matchScore: Math.round(score) };
      });

      // Sort by match score
      scored.sort((a, b) => b.matchScore - a.matchScore);

      // Paginate
      const paginated = scored.slice(offset, offset + limit);

      return {
        results: paginated.map(p => {
          const data = p.profileData as DeveloperProfile;
          return {
            username: p.username,
            summary: data.summary,
            archetype: data.developerArchetype,
            confidence: data.profileConfidence,
            topSkills: data.skillAssessment?.slice(0, 5).map(s => ({
              name: s.metric,
              score: s.score,
            })) || [],
            techStack: data.techStack?.slice(0, 8).map(t => t.name) || [],
            matchScore: p.matchScore,
            updatedAt: p.updatedAt,
          };
        }),
        total: scored.length,
        hasMore: offset + limit < scored.length,
      };
    }),
}); 
