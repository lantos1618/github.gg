import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { developerProfileCache, tokenUsage } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { generateDeveloperProfile } from '@/lib/ai/developer-profile';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { TRPCError } from '@trpc/server';
import { createGitHubServiceForUserOperations } from '@/lib/github';

export const profileRouter = router({
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
        
        // Sort repos by stars and activity for better analysis
        const sortedRepos = repos
          .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0))
          .slice(0, 20); // Top 20 repos

        const repoFiles: Array<{
          repoName: string;
          files: Array<{ path: string; content: string }>;
        }> = [];

        // If deep analysis is requested, fetch files from top repositories
        if (input.includeCodeAnalysis) {
          const topRepos = sortedRepos.slice(0, 5); // Analyze top 5 repos
          
          for (const repo of topRepos) {
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
                repoFiles.push({
                  repoName: repo.name,
                  files: validFiles,
                });
              }
            } catch (error) {
              console.warn(`Failed to analyze ${repo.name}:`, error);
              // Continue with other repos
            }
          }
        }

        // Generate developer profile with optional code analysis
        const result = await generateDeveloperProfile(username, sortedRepos, input.includeCodeAnalysis ? repoFiles : undefined, ctx.user.id);
        
        // Cache the result
        await db
          .insert(developerProfileCache)
          .values({
            username,
            profileData: result.profile,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [developerProfileCache.username],
            set: {
              profileData: result.profile,
              updatedAt: new Date(),
            },
          });
        
        // Log token usage
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'profile',
          repoOwner: username,
          repoName: null,
          model: 'gemini-2.5-flash',
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
          createdAt: new Date(),
        });
        
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
}); 