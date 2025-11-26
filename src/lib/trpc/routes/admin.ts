import { z } from 'zod';
import { router } from '@/lib/trpc/trpc';
import { adminProcedure } from '@/lib/trpc/admin';
import { db } from '@/db';
import { tokenUsage, userSubscriptions, user, developerProfileCache, developerEmails } from '@/db/schema';
import { eq, and, gte, lte, desc, inArray, sql } from 'drizzle-orm';
import { calculateTokenCost, calculateTotalCost, calculateDailyCostAndRevenue } from '@/lib/utils/cost-calculator';
import { generateDeveloperProfileStreaming, findAndStoreDeveloperEmail } from '@/lib/ai/developer-profile';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { TRPCError } from '@trpc/server';

export const adminRouter = router({
  // Admin check
  isAdmin: adminProcedure.query(async ({ ctx }) => {
    if (!process.env.ADMIN_EMAILS) {
      throw new Error('ADMIN_EMAILS is not configured');
    }
    const adminEmails = process.env.ADMIN_EMAILS.split(',').map(email => email.trim());
    const userEmail = ctx.user.email?.toLowerCase();
    return { isAdmin: !!userEmail && adminEmails.includes(userEmail) };
  }),

  // Trigger mass analysis (currently clears cache to force refresh)
  triggerAnalysis: adminProcedure
    .input(z.object({
      userIds: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const users = await db.query.user.findMany({
        where: inArray(user.id, input.userIds),
        columns: { name: true },
      });
      
      const usernames = users.map(u => u.name?.toLowerCase()).filter(Boolean) as string[];
      
      if (usernames.length > 0) {
        await db.delete(developerProfileCache)
          .where(inArray(developerProfileCache.username, usernames));
      }
      
      return { success: true, count: usernames.length };
    }),

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

        yield { type: 'progress', progress: 10, message: `Found ${smartSortedRepos.length} repositories` };

        // Fetch files for top 5 repos for deep analysis
        const repoFiles: Array<{
          repoName: string;
          files: Array<{ path: string; content: string }>;
        }> = [];

        const topRepos = smartSortedRepos.slice(0, 5);
        
        if (topRepos.length > 0) {
          yield { type: 'progress', progress: 15, message: 'Fetching repository files...' };
          
          const fileFetchPromises = topRepos.map(async (repo) => {
            try {
              const files = await githubService.getRepositoryFiles(username, repo.name, 'main');
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
                    const response = await githubService['octokit'].repos.getContent({
                      owner: username,
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
              if (validFiles.length > 0) return { repoName: repo.name, files: validFiles };
              return null;
            } catch { return null; }
          });

          const fileResults = await Promise.all(fileFetchPromises);
          fileResults.forEach(r => { if (r) repoFiles.push(r); });
        }

        // Generate Profile
        let result;
        const generator = generateDeveloperProfileStreaming({
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
            profileData: result.profile,
            updatedAt: new Date(),
          });

        // Log Token Usage (Attributed to SYSTEM/Admin)
        await db.insert(tokenUsage).values({
          userId: ctx.user.id, // Admin ID
          feature: 'admin_mass_analysis',
          repoOwner: username,
          model: 'gemini-3-pro-preview',
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

  // Get overall usage statistics
  getUsageStats: adminProcedure
    .input(z.object({
      startDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
      endDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
    }).optional())
    .query(async ({ input }) => {
      const conditions = [];
      
      if (input?.startDate) {
        conditions.push(gte(tokenUsage.createdAt, input.startDate));
      }
      
      if (input?.endDate) {
        conditions.push(lte(tokenUsage.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get all usage records without relations
      const usage = await db.query.tokenUsage.findMany({
        where: whereClause,
        orderBy: desc(tokenUsage.createdAt),
      });

      // Get user data separately
      const userIds = [...new Set(usage.map(u => u.userId))];
      const users = userIds.length > 0 
        ? await db.query.user.findMany({
            where: inArray(user.id, userIds)
          })
        : [];

      // Create a map of users
      const userMap = new Map(users.map(u => [u.id, u]));

      // Calculate costs
      const costBreakdown = calculateTotalCost(usage.map(u => ({
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        totalTokens: u.totalTokens,
        model: u.model || 'gemini-3-pro-preview', // Default model
      })));

      // Aggregate statistics
      const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
      const byokTokens = usage.filter(u => u.isByok).reduce((sum, u) => sum + u.totalTokens, 0);
      const managedTokens = usage.filter(u => !u.isByok).reduce((sum, u) => sum + u.totalTokens, 0);
      
      const uniqueUsers = new Set(usage.map(u => u.userId)).size;
      const uniqueRepos = new Set(usage.map(u => `${u.repoOwner}/${u.repoName}`)).size;

      // Feature breakdown
      const featureBreakdown = usage.reduce((acc, u) => {
        acc[u.feature] = (acc[u.feature] || 0) + u.totalTokens;
        return acc;
      }, {} as Record<string, number>);

      return {
        usage: usage.map(u => ({
          ...u,
          user: userMap.get(u.userId)
        })),
        summary: {
          totalTokens,
          byokTokens,
          managedTokens,
          totalCost: costBreakdown.totalCost,
          inputCost: costBreakdown.inputCost,
          outputCost: costBreakdown.outputCost,
          uniqueUsers,
          uniqueRepos,
          usageCount: usage.length,
        },
        costBreakdown,
        featureBreakdown,
      };
    }),

  // Get user-specific usage
  getUserUsage: adminProcedure
    .input(z.object({
      userId: z.string(),
      startDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
      endDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(tokenUsage.userId, input.userId)];
      
      if (input.startDate) {
        conditions.push(gte(tokenUsage.createdAt, input.startDate));
      }
      
      if (input.endDate) {
        conditions.push(lte(tokenUsage.createdAt, input.endDate));
      }

      const usage = await db.query.tokenUsage.findMany({
        where: and(...conditions),
        orderBy: desc(tokenUsage.createdAt),
      });

      const costBreakdown = calculateTotalCost(usage.map(u => ({
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        totalTokens: u.totalTokens,
        model: u.model || 'gemini-3-pro-preview',
      })));

      return {
        usage,
        costBreakdown,
        summary: {
          totalTokens: usage.reduce((sum, u) => sum + u.totalTokens, 0),
          byokTokens: usage.filter(u => u.isByok).reduce((sum, u) => sum + u.totalTokens, 0),
          managedTokens: usage.filter(u => !u.isByok).reduce((sum, u) => sum + u.totalTokens, 0),
          totalCost: costBreakdown.totalCost,
          usageCount: usage.length,
        },
      };
    }),

  // Get all users with their usage
  getAllUsers: adminProcedure
    .input(z.object({
      startDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
      endDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
    }).optional())
    .query(async ({ input }) => {
      const conditions = [];
      
      if (input?.startDate) {
        conditions.push(gte(tokenUsage.createdAt, input.startDate));
      }
      
      if (input?.endDate) {
        conditions.push(lte(tokenUsage.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get all users
      const users = await db.query.user.findMany();

      // Get usage data separately
      const usage = await db.query.tokenUsage.findMany({
        where: whereClause,
        orderBy: desc(tokenUsage.createdAt),
      });

      // Get subscription data separately
      const subscriptions = await db.query.userSubscriptions.findMany();

      // Create maps for quick lookup
      const usageMap = new Map<string, typeof usage>();
      const subscriptionMap = new Map(subscriptions.map(s => [s.userId, s]));

      // Group usage by user
      usage.forEach(u => {
        if (!usageMap.has(u.userId)) {
          usageMap.set(u.userId, []);
        }
        usageMap.get(u.userId)!.push(u);
      });

      // Calculate usage for each user
      const usersWithUsage = users.map(user => {
        const userUsage = usageMap.get(user.id) || [];
        const costBreakdown = calculateTotalCost(userUsage.map(u => ({
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
          totalTokens: u.totalTokens,
          model: u.model || 'gemini-3-pro-preview',
        })));

        return {
          ...user,
          usage: userUsage,
          costBreakdown,
          summary: {
            totalTokens: userUsage.reduce((sum, u) => sum + u.totalTokens, 0),
            byokTokens: userUsage.filter(u => u.isByok).reduce((sum, u) => sum + u.totalTokens, 0),
            managedTokens: userUsage.filter(u => !u.isByok).reduce((sum, u) => sum + u.totalTokens, 0),
            totalCost: costBreakdown.totalCost,
            usageCount: userUsage.length,
          },
          userSubscriptions: subscriptionMap.get(user.id),
        };
      });

      // Sort by total cost (highest first)
      usersWithUsage.sort((a, b) => b.summary.totalCost - a.summary.totalCost);

      return usersWithUsage;
    }),

  // Get cost breakdown by feature
  getFeatureCosts: adminProcedure
    .input(z.object({
      startDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
      endDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
    }).optional())
    .query(async ({ input }) => {
      const conditions = [];
      
      if (input?.startDate) {
        conditions.push(gte(tokenUsage.createdAt, input.startDate));
      }
      
      if (input?.endDate) {
        conditions.push(lte(tokenUsage.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const usage = await db.query.tokenUsage.findMany({
        where: whereClause,
        orderBy: desc(tokenUsage.createdAt),
      });

      // Group by feature and calculate costs
      const featureCosts = usage.reduce((acc, u) => {
        if (!acc[u.feature]) {
          acc[u.feature] = {
            feature: u.feature,
            totalTokens: 0,
            usageCount: 0,
            byokTokens: 0,
            managedTokens: 0,
            costBreakdown: { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' },
          };
        }

        const cost = calculateTokenCost({
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
          totalTokens: u.totalTokens,
          model: u.model || 'gemini-3-pro-preview',
        });

        acc[u.feature].totalTokens += u.totalTokens;
        acc[u.feature].usageCount += 1;
        acc[u.feature].byokTokens += u.isByok ? u.totalTokens : 0;
        acc[u.feature].managedTokens += u.isByok ? 0 : u.totalTokens;
        acc[u.feature].costBreakdown.inputCost += cost.inputCost;
        acc[u.feature].costBreakdown.outputCost += cost.outputCost;
        acc[u.feature].costBreakdown.totalCost += cost.totalCost;

        return acc;
      }, {} as Record<string, {
        feature: string;
        totalTokens: number;
        usageCount: number;
        byokTokens: number;
        managedTokens: number;
        costBreakdown: { inputCost: number; outputCost: number; totalCost: number; currency: string };
      }>);

      // Convert to array and sort by total cost
      const featureCostsArray = Object.values(featureCosts).sort((a, b) => b.costBreakdown.totalCost - a.costBreakdown.totalCost);

      return featureCostsArray;
    }),

  // Get subscription statistics
  getSubscriptionStats: adminProcedure
    .query(async () => {
      const subscriptions = await db.query.userSubscriptions.findMany();

      const stats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        canceled: subscriptions.filter(s => s.status === 'canceled').length,
        pastDue: subscriptions.filter(s => s.status === 'past_due').length,
        byPlan: {
          byok: subscriptions.filter(s => s.plan === 'byok' && s.status === 'active').length,
          pro: subscriptions.filter(s => s.plan === 'pro' && s.status === 'active').length,
        },
        monthlyRevenue: subscriptions
          .filter(s => s.status === 'active')
          .reduce((sum, s) => {
            const amount = s.plan === 'byok' ? 6.90 : s.plan === 'pro' ? 20.00 : 0;
            return sum + amount;
          }, 0),
      };

      return stats;
    }),

  // Get daily cost and revenue stats for the last 30 days
  getDailyStats: adminProcedure
    .query(async () => {
      // Get the last 30 days
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (29 - i));
        return d;
      });

      // Get all token usage and subscriptions in the last 30 days
      const startDate = days[0];
      const endDate = days[days.length - 1];

      const usage = await db.query.tokenUsage.findMany({
        where: and(gte(tokenUsage.createdAt, startDate), lte(tokenUsage.createdAt, new Date(endDate.getTime() + 24*60*60*1000))),
      });
      const subscriptions = await db.query.userSubscriptions.findMany({
        where: gte(userSubscriptions.currentPeriodEnd, startDate),
      });

      // Helper: get plan price
      const getPlanPrice = (plan: string) => plan === 'byok' ? 6.90 : plan === 'pro' ? 20.00 : 0;

      // Use DRY utility for daily stats
      const stats = calculateDailyCostAndRevenue({
        usages: usage.map(u => ({
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
          totalTokens: u.totalTokens,
          model: u.model || undefined,
          createdAt: u.createdAt || undefined,
        })),
        subscriptions: subscriptions.map(s => ({
          currentPeriodEnd: s.currentPeriodEnd,
          status: s.status,
          plan: s.plan,
        })),
        days,
        getPlanPrice,
      });
      return stats;
    }),
});
