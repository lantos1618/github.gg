import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/trpc';
import { createGitHubServiceFromSession } from '@/lib/github';
import { generateWikiWithCacheStreaming } from '@/lib/ai/wiki-generator';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { tokenUsage } from '@/db/schema';
import crypto from 'crypto';
import { collectRepositoryFiles } from '@/lib/wiki/file-collector';
import {
  insertWikiPages,
  getWikiPage,
  getWikiTableOfContents,
  incrementViewCount,
  getWikiPageViewers,
  deleteWikiPage,
  deleteRepositoryWiki,
  updateWikiPage,
  createWikiPage,
} from '@/lib/wiki/repository';
import { checkRepositoryWriteAccess } from '@/lib/wiki/permissions';

export const wikiRouter = router({
  /**
   * Generate wiki documentation for a repository
   * Protected: requires authentication
   */
  generateWikiPages: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      maxFiles: z.number().optional().default(200),
      useChunking: z.boolean().optional().default(false),
      tokensPerChunk: z.number().optional().default(800000),
    }))
    .subscription(async function* ({ input, ctx }) {
      const { owner, repo, maxFiles } = input;

      try {
        yield { type: 'progress', progress: 0, message: 'Starting wiki generation...' };
        yield { type: 'progress', progress: 5, message: 'Authenticating with GitHub...' };

        const githubService = await createGitHubServiceFromSession(ctx.session);

        // Fetch all metadata in parallel
        yield { type: 'progress', progress: 10, message: 'Fetching repository metadata...' };
        const [repoData, readmeResult, packageJsonResult] = await Promise.allSettled([
          githubService['octokit'].repos.get({ owner, repo }),
          githubService['octokit'].repos.getReadme({ owner, repo }),
          githubService['octokit'].repos.getContent({ owner, repo, path: 'package.json' }),
        ]);

        if (repoData.status === 'rejected') {
          yield { type: 'error', message: 'Failed to fetch repository data. Please check the repository exists and you have access.' };
          return;
        }

        // Process README
        let readme: string | undefined;
        if (readmeResult.status === 'fulfilled') {
          readme = Buffer.from(readmeResult.value.data.content, 'base64').toString('utf-8');
        }

        // Process package.json
        let packageJson: Record<string, unknown> | undefined;
        if (packageJsonResult.status === 'fulfilled' && 'content' in packageJsonResult.value.data) {
          const content = Buffer.from(packageJsonResult.value.data.content, 'base64').toString('utf-8');
          try {
            packageJson = JSON.parse(content);
          } catch {
            // Invalid JSON
          }
        }

        // Collect source files using dedicated module
        yield { type: 'progress', progress: 20, message: `Collecting up to ${maxFiles} source files...` };
        const files = await collectRepositoryFiles(owner, repo, githubService, maxFiles);

        yield { type: 'progress', progress: 35, message: `Collected ${files.length} source files, starting generation...` };

        // Generate wiki using Gemini context caching with real-time progress
        let wikiResult;
        for await (const update of generateWikiWithCacheStreaming({
          owner,
          repo,
          repoDescription: repoData.value.data.description || undefined,
          primaryLanguage: repoData.value.data.language || undefined,
          files,
          packageJson,
          readme,
        })) {
          if (update.type === 'progress') {
            yield { type: 'progress', progress: update.progress, message: update.message };
          } else if (update.type === 'complete') {
            wikiResult = update.result;
          } else if (update.type === 'ping') {
            yield { type: 'ping' };
          }
        }

        if (!wikiResult) {
          yield { type: 'error', message: 'Wiki generation did not complete successfully. Please try again.' };
          return;
        }

        yield { type: 'progress', progress: 70, message: 'Saving wiki pages...' };

        // Log token usage
        try {
          await db.insert(tokenUsage).values({
            userId: ctx.user.id,
            feature: 'wiki_generation',
            repoOwner: owner,
            repoName: repo,
            model: 'gemini-2.5-flash',
            inputTokens: wikiResult.usage.inputTokens,
            outputTokens: wikiResult.usage.outputTokens,
            totalTokens: wikiResult.usage.totalTokens,
            isByok: false,
          });
        } catch (dbError) {
          console.error('Failed to log token usage for wiki generation:', dbError);
        }

        // Calculate individual file hashes for cache invalidation
        const fileHashes: Record<string, string> = {};
        files.forEach(f => {
          fileHashes[f.path] = crypto.createHash('sha256').update(f.content).digest('hex');
        });

        // Insert pages using repository module
        const result = await insertWikiPages(owner, repo, wikiResult.pages, fileHashes);

        yield { type: 'progress', progress: 90, message: 'Wiki generation complete!' };

        yield {
          type: 'complete',
          data: {
            success: true,
            version: result.version,
            pages: result.pages,
            usage: wikiResult.usage,
          },
        };
      } catch (error) {
        console.error('Wiki generation error:', error);
        const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to generate wiki';
        yield { type: 'error', message: userFriendlyMessage };
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate wiki: ${userFriendlyMessage}`,
        });
      }
    }),

  /**
   * Get a wiki page by slug
   * Public: no authentication required for SEO
   */
  getWikiPage: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
      version: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, slug, version } = input;

      try {
        return await getWikiPage(owner, repo, slug, version);
      } catch (error) {
        console.error('Failed to fetch wiki page:', error);
        return null;
      }
    }),

  /**
   * Get table of contents for a repository wiki
   * Public: no authentication required
   */
  getWikiTableOfContents: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      version: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, version } = input;

      try {
        return await getWikiTableOfContents(owner, repo, version);
      } catch (error) {
        console.error('Failed to fetch wiki table of contents:', error);
        return { pages: [], version: 0 };
      }
    }),

  /**
   * Increment view count for a wiki page and track viewer
   * Public: no authentication required (tracks logged-in users when available)
   */
  incrementViewCount: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
      version: z.number().optional(),
      userId: z.string().optional(),
      username: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { owner, repo, slug, version, userId, username } = input;

      try {
        const success = await incrementViewCount(owner, repo, slug, version, userId, username);
        return { success };
      } catch (error) {
        console.error('Failed to increment view count:', error);
        return { success: false };
      }
    }),

  /**
   * Get viewers for a wiki page
   * Public: no authentication required
   */
  getWikiPageViewers: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
      version: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { owner, repo, slug, version } = input;

      try {
        return await getWikiPageViewers(owner, repo, slug, version);
      } catch (error) {
        console.error('Failed to fetch wiki page viewers:', error);
        return { viewers: [], totalViews: 0 };
      }
    }),

  /**
   * Delete a single wiki page
   * Protected: requires authentication and repository write access
   */
  deleteWikiPage: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { owner, repo, slug } = input;

      try {
        const hasAccess = await checkRepositoryWriteAccess(ctx.session, owner, repo);

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete wiki pages for this repository',
          });
        }

        const success = await deleteWikiPage(owner, repo, slug);

        if (!success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Wiki page not found',
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete wiki page: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Update/edit a wiki page
   * Protected: requires authentication and repository write access
   */
  updateWikiPage: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
      title: z.string(),
      content: z.string(),
      summary: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { owner, repo, slug, title, content, summary } = input;

      try {
        const hasAccess = await checkRepositoryWriteAccess(ctx.session, owner, repo);

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to edit wiki pages for this repository',
          });
        }

        const page = await updateWikiPage(owner, repo, slug, { title, content, summary });

        if (!page) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Wiki page not found',
          });
        }

        return {
          success: true,
          page,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update wiki page: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Create a new wiki page
   * Protected: requires authentication and repository write access
   */
  createWikiPage: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
      title: z.string(),
      content: z.string(),
      summary: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { owner, repo, slug, title, content, summary } = input;

      try {
        const hasAccess = await checkRepositoryWriteAccess(ctx.session, owner, repo);

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to create wiki pages for this repository',
          });
        }

        const page = await createWikiPage(owner, repo, { slug, title, content, summary });

        if (!page) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A page with this slug already exists',
          });
        }

        return {
          success: true,
          page,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create wiki page: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Delete all wiki pages for a repository
   * Protected: requires authentication and repository write access
   */
  deleteRepositoryWiki: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { owner, repo } = input;

      try {
        const hasAccess = await checkRepositoryWriteAccess(ctx.session, owner, repo);

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete wiki pages for this repository',
          });
        }

        const deletedCount = await deleteRepositoryWiki(owner, repo);

        return {
          success: true,
          deletedCount,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete wiki: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});
