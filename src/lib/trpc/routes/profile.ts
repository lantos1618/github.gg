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
import { findAndStoreDeveloperEmail, sendDeveloperProfileEmail } from '@/lib/ai/developer-profile';
import { Octokit } from '@octokit/rest';

export const profileRouter = router({
  getDeveloperEmail: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const { username } = input;

      // 1. Check if the user is registered on our platform by username
      const registeredUser = await db.query.user.findFirst({
        where: eq(user.name, username),
      });
      if (registeredUser?.email) {
        return { email: registeredUser.email, source: 'database' };
      }

      // 2. Check our cached developer emails table
      const cachedEmail = await db.query.developerEmails.findFirst({
        where: eq(developerEmails.username, username),
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
      
      // Check for cached profile
      const cached = await db
        .select()
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, username))
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
      // Find the most recent cached profile for this username (latest updatedAt)
      const cached = await db
        .select()
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, username))
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
      includeCodeAnalysis: z.boolean().optional().default(false), // New option for deeper analysis
    }))
    .mutation(async ({ input, ctx }) => {
      const { username } = input;
      
      // Check for active subscription
      const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
      if (!subscription || subscription.status !== 'active') {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Active subscription required for AI features' 
        });
      }
      
      // Get appropriate API key
      const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
      if (!keyInfo) {
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
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Daily limit of 5 profile generations reached. Upgrade to Pro for unlimited generations.' 
          });
        }
      }
      
      try {
        // Fetch user repositories
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        const repos = await githubService.getUserRepositories(username);
        
        // Smart repo selection: prioritize by stars, forks, and description quality
        const smartSortedRepos = repos
          .filter(repo => 
            // Exclude forks
            !repo.fork &&
            // Filter out repos with no description (often throwaway projects)
            repo.description &&
            repo.description.length > 10
            // Removed star filter to include more repos
          )
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
          .slice(0, 15); // Top 15 repos for selection

        console.log(`🎯 Smart repo selection: ${smartSortedRepos.length} repos selected from ${repos.length} total`);
        smartSortedRepos.slice(0, 5).forEach((repo, i) => {
          console.log(`  ${i + 1}. ${repo.name} (⭐${repo.stargazersCount || 0}, 🍴${repo.forksCount || 0})`);
        });

        const repoFiles: Array<{
          repoName: string;
          files: Array<{ path: string; content: string }>;
        }> = [];

        // If deep analysis is requested, fetch files from top repositories
        if (input.includeCodeAnalysis) {
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
        
        // Get next version number
        const maxVersionResult = await db
          .select({ max: sql<number>`MAX(version)` })
          .from(developerProfileCache)
          .where(eq(developerProfileCache.username, username));
        const nextVersion = (maxVersionResult[0]?.max || 0) + 1;
        
        console.log(`📝 Saving profile version ${nextVersion} for ${username}`);
        
        // Cache the result with proper versioning
        await db
          .insert(developerProfileCache)
          .values({
            username,
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
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });

        // Extract and email developer
        try {
          const email = await findAndStoreDeveloperEmail(githubService['octokit'], username, smartSortedRepos);
          if (email) {
            // Simple HTML render for now
            const html = `<h1>Your GitHub.gg Developer Profile</h1><pre>${JSON.stringify(result.profile, null, 2)}</pre>`;
            await sendDeveloperProfileEmail(email, html);
          }
        } catch (e) {
          console.warn('Failed to extract/send developer email:', e);
        }
        
        return {
          profile: result.profile,
          cached: false,
          stale: false,
          lastUpdated: new Date(),
        };
      } catch (error) {
        console.error('Error generating developer profile:', error);
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to generate developer profile' 
        });
      }
    }),

  clearProfileCache: protectedProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
    }))
    .mutation(async ({ input }) => {
      const { username } = input;

      await db
        .delete(developerProfileCache)
        .where(eq(developerProfileCache.username, username));

      return { success: true };
    }),

  getProfileVersions: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select({ version: developerProfileCache.version, updatedAt: developerProfileCache.updatedAt })
        .from(developerProfileCache)
        .where(eq(developerProfileCache.username, input.username))
        .orderBy(desc(developerProfileCache.version));
      // Return as array for compatibility with existing UI
      return result;
    }),

  getProfileByVersion: publicProcedure
    .input(z.object({ username: z.string(), version: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(developerProfileCache)
        .where(
          and(
            eq(developerProfileCache.username, input.username),
            eq(developerProfileCache.version, input.version)
          )
        )
        .limit(1);
      return result[0] || null;
    }),
}); 