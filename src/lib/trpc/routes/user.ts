import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { userApiKeys, tokenUsage, userSubscriptions } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { encryptApiKey, validateApiKey } from '@/lib/utils/encryption';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  // API Key Management
  saveApiKey: protectedProcedure
    .input(z.object({ 
      apiKey: z.string().min(1, 'API key is required') 
    }))
    .mutation(async ({ input, ctx }) => {
      if (!validateApiKey(input.apiKey)) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Invalid Gemini API key format. Should start with "gza_"' 
        });
      }

      const encrypted = encryptApiKey(input.apiKey);
      
      await db.insert(userApiKeys).values({
        userId: ctx.user.id,
        encryptedGeminiApiKey: encrypted,
      }).onConflictDoUpdate({
        target: userApiKeys.userId,
        set: { encryptedGeminiApiKey: encrypted }
      });

      return { success: true };
    }),

  deleteApiKey: protectedProcedure
    .mutation(async ({ ctx }) => {
      await db.delete(userApiKeys)
        .where(eq(userApiKeys.userId, ctx.user.id));
      
      return { success: true };
    }),

  getApiKeyStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const key = await db.query.userApiKeys.findFirst({
        where: eq(userApiKeys.userId, ctx.user.id)
      });
      
      return { hasKey: !!key };
    }),

  // Usage Statistics
  getUsageStats: protectedProcedure
    .input(z.object({ 
      startDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional(),
      endDate: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date()).optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      const conditions = [eq(tokenUsage.userId, ctx.user.id)];
      
      if (input?.startDate) {
        conditions.push(gte(tokenUsage.createdAt, input.startDate));
      }
      
      if (input?.endDate) {
        conditions.push(lte(tokenUsage.createdAt, input.endDate));
      }

      const usage = await db.query.tokenUsage.findMany({
        where: conditions.length > 1 ? and(...conditions) : conditions[0],
        orderBy: desc(tokenUsage.createdAt)
      });
      
      const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
      const byokTokens = usage.filter(u => u.isByok).reduce((sum, u) => sum + u.totalTokens, 0);
      const managedTokens = usage.filter(u => !u.isByok).reduce((sum, u) => sum + u.totalTokens, 0);
      
      return { 
        usage, 
        totalTokens,
        byokTokens,
        managedTokens,
        usageCount: usage.length
      };
    }),

  // Subscription Management
  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, ctx.user.id)
      });
      
      return subscription;
    }),

  getCurrentPlan: protectedProcedure
    .query(async ({ ctx }) => {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, ctx.user.id)
      });
      
      if (!subscription || subscription.status !== 'active') {
        return { plan: 'free' as const };
      }
      
      return { plan: subscription.plan as 'byok' | 'pro' };
    }),
}); 