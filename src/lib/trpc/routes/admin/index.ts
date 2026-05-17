import { z } from 'zod';
import { router } from '@/lib/trpc/trpc';
import { adminProcedure } from '@/lib/trpc/admin';
import { db } from '@/db';
import { user, developerProfileCache } from '@/db/schema';
import { inArray, sql } from 'drizzle-orm';
import { generateDeveloperProfileStreaming } from '@/lib/ai/developer-profile';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { enqueue, dequeue, updateQueueItem, getQueueLength, getUserQueueItems } from '@/lib/analysis/job-store';
import { generateObject } from 'ai';
import { GEMINI_FLASH } from '@/lib/ai/models';
import { adminProfileRouter } from './profile';
import { adminNetworkRouter } from './network';
import { adminAnalyticsRouter } from './analytics';

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
        columns: { name: true, githubUsername: true },
      });

      // Prefer githubUsername, fallback to name if it looks like a username (no spaces), otherwise skip
      const usernames = users.map(u => {
        if (u.githubUsername) return u.githubUsername.toLowerCase();
        if (u.name && !u.name.includes(' ')) return u.name.toLowerCase();
        return null;
      }).filter(Boolean) as string[];

      if (usernames.length > 0) {
        await db.delete(developerProfileCache)
          .where(inArray(developerProfileCache.username, usernames));
      }

      return { success: true, count: usernames.length };
    }),

  // Profile generation (subscription)
  generateProfile: adminProfileRouter.generateProfile,

  // Extract GitHub usernames from unstructured text using AI
  extractUsernames: adminProcedure
    .input(z.object({ text: z.string().min(1).max(10000) }))
    .mutation(async ({ input }) => {
      const { object } = await generateObject({
        model: GEMINI_FLASH,
        schema: z.object({
          usernames: z.array(z.string()).describe('GitHub usernames extracted from the text'),
        }),
        messages: [{
          role: 'user',
          content: `Extract all GitHub usernames from this text. Look for:
- Direct usernames (e.g. "torvalds", "@antfu")
- GitHub URLs (e.g. github.com/username)
- References like "check out username's repos"
- Names that look like they could be GitHub handles

Only return valid-looking GitHub usernames (alphanumeric + hyphens, no spaces).
Remove @ prefixes. Deduplicate. Return an empty array if none found.

Text:
${input.text}`,
        }],
      });
      return { usernames: [...new Set(object.usernames.map((u: string) => u.replace(/^@/, '').trim()).filter(Boolean))] };
    }),

  // Enqueue batch profile generation
  batchEnqueueProfiles: adminProcedure
    .input(z.object({ usernames: z.array(z.string().min(1)).min(1).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const ids: string[] = [];
      for (const username of input.usernames) {
        const id = await enqueue('profile', { username }, ctx.user.id);
        ids.push(id);
      }
      return { queued: ids.length, ids };
    }),

  // Network / talent discovery
  getNetworkUsers: adminNetworkRouter.getNetworkUsers,

  // Get queue status
  getQueueStatus: adminProcedure
    .input(z.object({ type: z.enum(['profile', 'scorecard', 'wiki', 'diagram', 'ai-slop']).default('profile') }))
    .query(async ({ input, ctx }) => {
      const length = await getQueueLength(input.type);
      const userItems = await getUserQueueItems(input.type, ctx.user.id);
      return { queueLength: length, userItems };
    }),

  // Process next item in queue (drain one)
  processNextInQueue: adminProcedure
    .input(z.object({ type: z.enum(['profile', 'scorecard', 'wiki', 'diagram', 'ai-slop']).default('profile') }))
    .mutation(async ({ input, ctx }) => {
      const item = await dequeue(input.type);
      if (!item) return { processed: false, message: 'Queue is empty' };

      if (input.type === 'profile') {
        const username = item.params.username as string;
        try {
          // Minimal profile generation — reuse the existing SSE flow's logic
          const githubService = await createGitHubServiceForUserOperations(ctx.session);
          const repos = await githubService.getUserRepositories(username);
          if (!repos || repos.length === 0) {
            await updateQueueItem(item.id, { status: 'failed', error: 'No public repos found', completedAt: Date.now() });
            return { processed: true, username, status: 'failed', error: 'No public repos found' };
          }

          const topRepos = repos.filter(r => !r.fork).sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0)).slice(0, 5);

          // Run the streaming generator
          const generator = generateDeveloperProfileStreaming({ username, repos: topRepos, userId: ctx.user.id });
          let result: any = null;
          for await (const update of generator) {
            if (update.type === 'complete' && update.result) result = update.result;
          }

          if (!result) {
            await updateQueueItem(item.id, { status: 'failed', error: 'Generation returned no result', completedAt: Date.now() });
            return { processed: true, username, status: 'failed', error: 'No result' };
          }

          // Cache the profile
          const normalizedUsername = username.toLowerCase();
          await db.execute(sql`
            INSERT INTO developer_profile_cache (id, username, version, profile_data, created_at, updated_at)
            SELECT gen_random_uuid(), ${normalizedUsername},
                   COALESCE(MAX(version), 0) + 1,
                   ${JSON.stringify(result.profile)}::jsonb,
                   NOW(), NOW()
            FROM developer_profile_cache
            WHERE username = ${normalizedUsername}
          `);

          await updateQueueItem(item.id, { status: 'completed', completedAt: Date.now() });
          return { processed: true, username, status: 'completed' };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          await updateQueueItem(item.id, { status: 'failed', error: msg, completedAt: Date.now() });
          return { processed: true, username, status: 'failed', error: msg };
        }
      }

      return { processed: false, message: `Queue type '${input.type}' processing not implemented yet` };
    }),

  // Analytics / usage / cost / subscription stats
  getUsageStats: adminAnalyticsRouter.getUsageStats,
  getUserUsage: adminAnalyticsRouter.getUserUsage,
  getAllUsers: adminAnalyticsRouter.getAllUsers,
  getFeatureCosts: adminAnalyticsRouter.getFeatureCosts,
  getSubscriptionStats: adminAnalyticsRouter.getSubscriptionStats,
  getDailyStats: adminAnalyticsRouter.getDailyStats,
});
