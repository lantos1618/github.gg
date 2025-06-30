import { z } from 'zod';
import { router } from '../trpc';
import { adminProcedure } from '../admin';
import { db } from '@/db';
import { tokenUsage, userSubscriptions } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { calculateTokenCost, calculateTotalCost } from '@/lib/utils/cost-calculator';
import { env } from '@/lib/env';

export const adminRouter = router({
  // Admin check
  isAdmin: adminProcedure.query(async ({ ctx }) => {
    const adminEmails = env.ADMIN_EMAILS.map(e => e.toLowerCase());
    const userEmail = ctx.user.email?.toLowerCase();
    return { isAdmin: !!userEmail && adminEmails.includes(userEmail) };
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

      // Get all usage records
      const usage = await db.query.tokenUsage.findMany({
        where: whereClause,
        orderBy: desc(tokenUsage.createdAt),
        with: {
          user: true,
        },
      });

      // Calculate costs
      const costBreakdown = calculateTotalCost(usage.map(u => ({
        promptTokens: u.promptTokens,
        completionTokens: u.completionTokens,
        totalTokens: u.totalTokens,
        model: u.model || 'gemini-2.5-flash', // Default model
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
        usage,
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
        with: {
          user: true,
        },
      });

      const costBreakdown = calculateTotalCost(usage.map(u => ({
        promptTokens: u.promptTokens,
        completionTokens: u.completionTokens,
        totalTokens: u.totalTokens,
        model: u.model || 'gemini-2.5-flash',
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

      // Get all users with their usage
      const users = await db.query.user.findMany({
        with: {
          tokenUsage: {
            where: whereClause,
            orderBy: desc(tokenUsage.createdAt),
          },
          userSubscriptions: true,
        },
      });

      // Calculate usage for each user
      const usersWithUsage = users.map(user => {
        const usage = user.tokenUsage || [];
        const costBreakdown = calculateTotalCost(usage.map(u => ({
          promptTokens: u.promptTokens,
          completionTokens: u.completionTokens,
          totalTokens: u.totalTokens,
          model: u.model || 'gemini-2.5-flash',
        })));

        return {
          ...user,
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
          promptTokens: u.promptTokens,
          completionTokens: u.completionTokens,
          totalTokens: u.totalTokens,
          model: u.model || 'gemini-2.5-flash',
        });

        acc[u.feature].totalTokens += u.totalTokens;
        acc[u.feature].usageCount += 1;
        acc[u.feature].byokTokens += u.isByok ? u.totalTokens : 0;
        acc[u.feature].managedTokens += u.isByok ? 0 : u.totalTokens;
        acc[u.feature].costBreakdown.inputCost += cost.inputCost;
        acc[u.feature].costBreakdown.outputCost += cost.outputCost;
        acc[u.feature].costBreakdown.totalCost += cost.totalCost;

        return acc;
      }, {} as Record<string, any>);

      // Convert to array and sort by total cost
      const featureCostsArray = Object.values(featureCosts).sort((a: any, b: any) => b.costBreakdown.totalCost - a.costBreakdown.totalCost);

      return featureCostsArray;
    }),

  // Get subscription statistics
  getSubscriptionStats: adminProcedure
    .query(async () => {
      const subscriptions = await db.query.userSubscriptions.findMany({
        with: {
          user: true,
        },
      });

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
}); 