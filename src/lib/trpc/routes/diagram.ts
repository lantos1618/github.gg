import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { generateRepoDiagramVercel } from '@/lib/ai/diagram';
import { diagramInputSchemaServer, diagramBaseSchema } from '@/lib/types/diagram';
import { parseGeminiError } from '@/lib/utils/errorHandling';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { db } from '@/db';
import { tokenUsage, repositoryDiagrams } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createGitHubServiceFromSession } from '@/lib/github';

export const diagramRouter = router({
  getDiagram: protectedProcedure
    .input(diagramBaseSchema)
    .query(async ({ input, ctx }) => {
      const { user, repo, ref, diagramType } = input;
      
      // Check for cached diagram
      const cached = await db
        .select()
        .from(repositoryDiagrams)
        .where(
          and(
            eq(repositoryDiagrams.userId, ctx.user.id),
            eq(repositoryDiagrams.repoOwner, user),
            eq(repositoryDiagrams.repoName, repo),
            eq(repositoryDiagrams.ref, ref || 'main'),
            eq(repositoryDiagrams.diagramType, diagramType)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        const diagram = cached[0];
        const isStale = new Date().getTime() - diagram.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        
        return {
          diagramCode: diagram.diagramCode,
          format: diagram.format,
          diagramType,
          cached: true,
          stale: isStale,
          lastUpdated: diagram.updatedAt,
        };
      }

      return {
        diagramCode: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  // Public endpoint: anyone can fetch cached diagram for a repo/ref/type
  publicGetDiagram: publicProcedure
    .input(diagramBaseSchema)
    .query(async ({ input, ctx }) => {
      const { user, repo, ref, diagramType } = input;
      
      // Check repository access and privacy
      try {
        const githubService = await createGitHubServiceFromSession(ctx.session);
        const repoInfo = await githubService.getRepositoryInfo(user, repo);
        
        // If the repository is private, check if user has access
        if (repoInfo.private === true) {
          // If user is not authenticated, block access
          if (!ctx.session?.user) {
            return {
              diagramCode: null,
              cached: false,
              stale: false,
              lastUpdated: null,
              error: 'This repository is private',
            };
          }
          // User is authenticated, so they should have access (since we successfully fetched repo info)
          // Continue to show the diagram
        }
      } catch {
        // If we can't access the repo (404 or no auth), it might be private or user doesn't have access
        return {
          diagramCode: null,
          cached: false,
          stale: false,
          lastUpdated: null,
          error: 'Unable to access repository',
        };
      }
      
      // Find the most recent diagram for this repo/ref/type (any user)
      const cached = await db
        .select()
        .from(repositoryDiagrams)
        .where(
          and(
            eq(repositoryDiagrams.repoOwner, user),
            eq(repositoryDiagrams.repoName, repo),
            eq(repositoryDiagrams.ref, ref || 'main'),
            eq(repositoryDiagrams.diagramType, diagramType)
          )
        )
        .orderBy(desc(repositoryDiagrams.version))
        .limit(1);
      
      console.log('🔥 publicGetDiagram:', {
        user,
        repo,
        ref: ref || 'main',
        diagramType,
        cachedCount: cached.length,
        cachedVersion: cached[0]?.version,
        cachedUserId: cached[0]?.userId
      });
      
      if (cached.length > 0) {
        const diagram = cached[0];
        const isStale = new Date().getTime() - diagram.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        return {
          diagramCode: diagram.diagramCode,
          format: diagram.format,
          diagramType,
          cached: true,
          stale: isStale,
          lastUpdated: diagram.updatedAt,
        };
      }
      return {
        diagramCode: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  getDiagramVersions: publicProcedure
    .input(diagramBaseSchema)
    .query(async ({ input }) => {
      const versions = await db
        .select({ version: repositoryDiagrams.version, updatedAt: repositoryDiagrams.updatedAt })
        .from(repositoryDiagrams)
        .where(
          and(
            eq(repositoryDiagrams.repoOwner, input.user),
            eq(repositoryDiagrams.repoName, input.repo),
            eq(repositoryDiagrams.ref, input.ref || 'main'),
            eq(repositoryDiagrams.diagramType, input.diagramType)
          )
        )
        .orderBy(desc(repositoryDiagrams.version));
      
      console.log('🔥 getDiagramVersions:', {
        user: input.user,
        repo: input.repo,
        ref: input.ref || 'main',
        diagramType: input.diagramType,
        versions: versions.map(v => v.version)
      });
      
      return versions;
    }),

  getDiagramByVersion: publicProcedure
    .input(diagramBaseSchema.extend({ version: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(repositoryDiagrams)
        .where(
          and(
            eq(repositoryDiagrams.repoOwner, input.user),
            eq(repositoryDiagrams.repoName, input.repo),
            eq(repositoryDiagrams.ref, input.ref || 'main'),
            eq(repositoryDiagrams.diagramType, input.diagramType),
            eq(repositoryDiagrams.version, input.version)
          )
        )
        .limit(1);
      return result[0] || null;
    }),

  generateDiagram: protectedProcedure
    .input(diagramInputSchemaServer)
    .mutation(async ({ input, ctx }) => {
      const { owner, repo, ref, diagramType, options, previousResult, lastError, isRetry } = input;
      
      // 1. Check user plan and get API key
      const { subscription, plan } = await getUserPlanAndKey(ctx.user.id);
      
      // Check for active subscription
      if (!subscription || subscription.status !== 'active') {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Active subscription required for AI features' 
        });
      }
      
      // 2. Get appropriate API key
      const keyInfo = await getApiKeyForUser(ctx.user.id, plan as 'byok' | 'pro');
      if (!keyInfo) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Please add your Gemini API key in settings to use this feature' 
        });
      }
      
      // NEW: Fetch files on the server-side
      const githubService = await createGitHubServiceFromSession(ctx.session);
      const { files: repoFiles } = await githubService.getRepositoryFiles(
        owner,
        repo,
        ref,
        500 // Limit to 500 files to prevent abuse on the backend
      );

      // Filter files to only include those with content and map to expected format
      const files = repoFiles
        .filter(file => file.content && file.type === 'file')
        .map(file => ({
          path: file.path,
          content: file.content!,
          size: file.size,
        }));

      try {
        const result = await generateRepoDiagramVercel({
          files,
          repoName: repo,
          diagramType,
          options,
          previousResult,
          lastError,
          isRetry,
        });
        
        // 3. Save diagram to database
        const maxVersionResult = await db
          .select({ max: sql<number>`MAX(${repositoryDiagrams.version})` })
          .from(repositoryDiagrams)
          .where(
            and(
              eq(repositoryDiagrams.userId, ctx.user.id),
              eq(repositoryDiagrams.repoOwner, owner),
              eq(repositoryDiagrams.repoName, repo),
              eq(repositoryDiagrams.ref, ref || 'main'),
              eq(repositoryDiagrams.diagramType, diagramType)
            )
          );
        const maxVersion = maxVersionResult[0]?.max ?? 0;
        const nextVersion = maxVersion + 1;
        
        console.log('🔥 Version calculation:', {
          userId: ctx.user.id,
          repoOwner: owner,
          repoName: repo,
          ref: ref || 'main',
          diagramType,
          maxVersion,
          nextVersion
        });
        
        await db
          .insert(repositoryDiagrams)
          .values({
            userId: ctx.user.id,
            repoOwner: owner,
            repoName: repo,
            ref: ref || 'main',
            diagramType,
            version: nextVersion,
            diagramCode: result.diagramCode,
            format: 'mermaid',
            options: options || {},
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              repositoryDiagrams.userId,
              repositoryDiagrams.repoOwner,
              repositoryDiagrams.repoName,
              repositoryDiagrams.ref,
              repositoryDiagrams.diagramType,
              repositoryDiagrams.version
            ],
            set: {
              diagramCode: result.diagramCode,
              format: 'mermaid',
              options: options || {},
              updatedAt: new Date(),
            }
          });
        
        // 4. Log token usage with actual values from AI response
        await db.insert(tokenUsage).values({
          userId: ctx.user.id,
          feature: 'diagram',
          repoOwner: owner,
          repoName: repo,
          model: 'gemini-2.5-pro', // Default model used
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          isByok: keyInfo.isByok,
        });
        
        return {
          diagramCode: result.diagramCode,
          format: 'mermaid',
          diagramType,
          cached: false,
          stale: false,
          lastUpdated: new Date(),
        };
      } catch (error) {
        console.error('🔥 Raw error in diagram route:', error);
        console.error('🔥 Error type:', typeof error);
        console.error('🔥 Error message:', error instanceof Error ? error.message : 'No message');
        console.error('🔥 Error stack:', error instanceof Error ? error.stack : 'No stack');
        
        const userFriendlyMessage = parseGeminiError(error);
        throw new Error(userFriendlyMessage);
      }
    }),

  clearCache: protectedProcedure
    .input(diagramBaseSchema)
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref, diagramType } = input;

      await db
        .delete(repositoryDiagrams)
        .where(
          and(
            eq(repositoryDiagrams.userId, ctx.user.id),
            eq(repositoryDiagrams.repoOwner, user),
            eq(repositoryDiagrams.repoName, repo),
            eq(repositoryDiagrams.ref, ref || 'main'),
            eq(repositoryDiagrams.diagramType, diagramType)
          )
        );

      return { success: true };
    }),
}); 