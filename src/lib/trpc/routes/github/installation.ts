import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { db } from '@/db';
import { account, installationRepositories } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export const installationRouter = router({
  // --- Check if user has a linked GitHub App installation (REQUIRED for app usage) ---
  checkInstallation: protectedProcedure
    .query(async ({ ctx }) => {
      const userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, ctx.user.id),
          eq(account.providerId, 'github')
        ),
      });
      
      const installationId = userAccount?.installationId;
      
      if (!installationId) {
        return {
          hasInstallation: false,
          installationId: null,
          canUseApp: false, // Can't use app without GitHub App installation
        };
      }

      // Verify the installation actually exists on GitHub
      try {
        const { githubApp } = await import('@/lib/github/app');
        await githubApp.octokit.request(
          'GET /app/installations/{installation_id}',
          {
            installation_id: installationId,
          }
        );
        
        return {
          hasInstallation: true,
          installationId,
          canUseApp: true, // Can use app with valid GitHub App installation
        };
      } catch (error) {
        console.log(`❌ Installation ${installationId} not found on GitHub, clearing from database`, error);
        
        // Clear the invalid installation ID from the user's account
        await db.update(account)
          .set({ 
            installationId: null,
            updatedAt: new Date()
          })
          .where(and(
            eq(account.userId, ctx.user.id),
            eq(account.providerId, 'github')
          ));
        
        return {
          hasInstallation: false,
          installationId: null,
          canUseApp: false, // Can't use app without valid GitHub App installation
        };
      }
    }),

  // --- Check if user can use the app (requires both OAuth + GitHub App) ---
  canUseApp: protectedProcedure
    .query(async ({ ctx }) => {
      const userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, ctx.user.id),
          eq(account.providerId, 'github')
        ),
      });
      
      if (!userAccount?.installationId) {
        return { canUseApp: false, reason: 'GitHub App not installed' };
      }

      // Verify the installation exists
      try {
        const { githubApp } = await import('@/lib/github/app');
        await githubApp.octokit.request(
          'GET /app/installations/{installation_id}',
          {
            installation_id: userAccount.installationId,
          }
        );
        
        return { canUseApp: true };
      } catch {
        // Clear invalid installation
        await db.update(account)
          .set({ 
            installationId: null,
            updatedAt: new Date()
          })
          .where(and(
            eq(account.userId, ctx.user.id),
            eq(account.providerId, 'github')
          ));
        
        return { canUseApp: false, reason: 'GitHub App installation invalid' };
      }
    }),

  // --- Get repositories for the user's GitHub App installation (fallback for user repos) ---
  getInstallationRepositories: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input, ctx }) => {
      // Get the user's linked installationId
      const userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, ctx.user.id),
          eq(account.providerId, 'github')
        ),
      });
      const installationId = userAccount?.installationId;
      if (!installationId) return [];
      // Query installationRepositories for this installation
      const repos = await db.query.installationRepositories.findMany({
        where: eq(installationRepositories.installationId, installationId),
        limit: input.limit,
      });
      // Map to { owner, name, repositoryId }
      return repos.map(r => {
        const [owner, name] = r.fullName.split('/');
        return { owner, name, repositoryId: r.repositoryId };
      });
    }),
}); 