import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/trpc';
import { createPublicGitHubService } from '@/lib/github';
import { generateWikiWithCache } from '@/lib/ai/wiki-generator';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { tokenUsage, repositoryWikiPages } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Calculate a hash of file paths and contents to detect changes
 */
function calculateFileHash(files: Array<{ path: string; content: string }>): string {
  const content = files
    .map(f => `${f.path}:${f.content}`)
    .sort()
    .join('\n');
  return crypto.createHash('sha256').update(content).digest('hex');
}

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
      tokensPerChunk: z.number().optional().default(800000), // 800k tokens per chunk (1M context window)
    }))
    .mutation(async ({ input, ctx }) => {
      const { owner, repo, maxFiles, useChunking, tokensPerChunk } = input;
      const githubService = createPublicGitHubService();

      try {
        // Fetch repository information
        const repoData = await githubService['octokit'].repos.get({
          owner,
          repo,
        });

        // Fetch repository contents
        const contents = await githubService['octokit'].repos.getContent({
          owner,
          repo,
          path: '',
        });

        // Fetch README if exists
        let readme: string | undefined;
        try {
          const readmeData = await githubService['octokit'].repos.getReadme({
            owner,
            repo,
          });
          readme = Buffer.from(readmeData.data.content, 'base64').toString('utf-8');
        } catch {
          // README doesn't exist
        }

        // Fetch package.json if exists
        let packageJson: Record<string, unknown> | undefined;
        try {
          const packageData = await githubService['octokit'].repos.getContent({
            owner,
            repo,
            path: 'package.json',
          });
          if ('content' in packageData.data) {
            const content = Buffer.from(packageData.data.content, 'base64').toString('utf-8');
            packageJson = JSON.parse(content);
          }
        } catch {
          // package.json doesn't exist
        }

        // Collect source files
        const files: Array<{
          path: string;
          content: string;
          language: string;
          size: number;
        }> = [];

        async function collectFiles(path: string, depth = 0): Promise<void> {
          if (depth > 3 || files.length >= maxFiles) return;

          try {
            const items = await githubService['octokit'].repos.getContent({
              owner,
              repo,
              path,
            });

            if (!Array.isArray(items.data)) return;

            for (const item of items.data) {
              if (files.length >= maxFiles) break;

              if (item.type === 'file') {
                // Only include source files
                const ext = item.name.split('.').pop()?.toLowerCase();
                const sourceExts = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h'];

                if (ext && sourceExts.includes(ext) && item.size && item.size < 100000) {
                  try {
                    const fileData = await githubService['octokit'].repos.getContent({
                      owner,
                      repo,
                      path: item.path,
                    });

                    if ('content' in fileData.data) {
                      const content = Buffer.from(fileData.data.content, 'base64').toString('utf-8');
                      files.push({
                        path: item.path,
                        content,
                        language: ext,
                        size: item.size,
                      });
                    }
                  } catch (error) {
                    console.error(`Failed to fetch ${item.path}:`, error);
                  }
                }
              } else if (item.type === 'dir' && !item.path.includes('node_modules') && !item.path.includes('.git')) {
                await collectFiles(item.path, depth + 1);
              }
            }
          } catch (error) {
            console.error(`Failed to collect files from ${path}:`, error);
          }
        }

        await collectFiles('');

        // Generate wiki using Gemini context caching
        const wikiResult = await generateWikiWithCache({
          owner,
          repo,
          repoDescription: repoData.data.description || undefined,
          primaryLanguage: repoData.data.language || undefined,
          files,
          packageJson,
          readme,
        });

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

        // Calculate file hash for cache invalidation
        const fileHash = calculateFileHash(files.map(f => ({ path: f.path, content: f.content })));
        const fileHashes: Record<string, string> = {};
        files.forEach(f => {
          fileHashes[f.path] = crypto.createHash('sha256').update(f.content).digest('hex');
        });

        // Check if we need to create new versions
        const existingPages = await db
          .select()
          .from(repositoryWikiPages)
          .where(
            and(
              eq(repositoryWikiPages.repoOwner, owner),
              eq(repositoryWikiPages.repoName, repo)
            )
          )
          .orderBy(desc(repositoryWikiPages.version));

        const latestVersion = existingPages.length > 0 ? existingPages[0].version : 0;
        const nextVersion = latestVersion + 1;

        // Insert all pages with the new version
        const insertedPages = await Promise.all(
          wikiResult.pages.map((page, index) =>
            db.insert(repositoryWikiPages).values({
              repoOwner: owner,
              repoName: repo,
              slug: page.slug,
              title: page.title,
              content: page.content,
              summary: page.summary,
              version: nextVersion,
              fileHashes,
              metadata: {
                order: index,
                keywords: [owner, repo, 'documentation', 'wiki'],
                category: 'documentation',
                // Store AI-generated metadata for regeneration
                systemPrompt: '', // Will be populated in future enhancement
                dependsOn: [],
                priority: 10 - index, // Higher priority for earlier pages
              },
              isPublic: true,
              viewCount: 0,
            }).returning()
          )
        );

        return {
          success: true,
          version: nextVersion,
          pages: insertedPages.map(p => p[0]),
          usage: wikiResult.usage,
        };
      } catch (error) {
        console.error('Wiki generation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate wiki: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        const conditions = [
          eq(repositoryWikiPages.repoOwner, owner),
          eq(repositoryWikiPages.repoName, repo),
          eq(repositoryWikiPages.slug, slug),
          eq(repositoryWikiPages.isPublic, true),
        ];

        if (version !== undefined) {
          conditions.push(eq(repositoryWikiPages.version, version));
        }

        const query = db
          .select()
          .from(repositoryWikiPages)
          .where(and(...conditions));

        const result = version === undefined
          ? await query.orderBy(desc(repositoryWikiPages.version)).limit(1)
          : await query;

        if (result.length === 0) {
          return null;
        }

        return result[0];
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
        const conditions = [
          eq(repositoryWikiPages.repoOwner, owner),
          eq(repositoryWikiPages.repoName, repo),
          eq(repositoryWikiPages.isPublic, true),
        ];

        if (version !== undefined) {
          conditions.push(eq(repositoryWikiPages.version, version));
        }

        // Get latest version if not specified
        let targetVersion = version;
        if (targetVersion === undefined) {
          const latestPage = await db
            .select({ version: repositoryWikiPages.version })
            .from(repositoryWikiPages)
            .where(
              and(
                eq(repositoryWikiPages.repoOwner, owner),
                eq(repositoryWikiPages.repoName, repo),
                eq(repositoryWikiPages.isPublic, true)
              )
            )
            .orderBy(desc(repositoryWikiPages.version))
            .limit(1);

          if (latestPage.length === 0) {
            return { pages: [], version: 0 };
          }

          targetVersion = latestPage[0].version;
          conditions.push(eq(repositoryWikiPages.version, targetVersion));
        }

        const pages = await db
          .select({
            slug: repositoryWikiPages.slug,
            title: repositoryWikiPages.title,
            summary: repositoryWikiPages.summary,
            viewCount: repositoryWikiPages.viewCount,
            metadata: repositoryWikiPages.metadata,
            updatedAt: repositoryWikiPages.updatedAt,
          })
          .from(repositoryWikiPages)
          .where(and(...conditions));

        // Sort by metadata.order if available
        const sortedPages = pages.sort((a, b) => {
          const aOrder = (a.metadata as { order?: number })?.order ?? 999;
          const bOrder = (b.metadata as { order?: number })?.order ?? 999;
          return aOrder - bOrder;
        });

        return {
          pages: sortedPages,
          version: targetVersion,
        };
      } catch (error) {
        console.error('Failed to fetch wiki table of contents:', error);
        return { pages: [], version: 0 };
      }
    }),

  /**
   * Increment view count for a wiki page
   * Public: no authentication required
   */
  incrementViewCount: publicProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
      version: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { owner, repo, slug, version } = input;

      try {
        const conditions = [
          eq(repositoryWikiPages.repoOwner, owner),
          eq(repositoryWikiPages.repoName, repo),
          eq(repositoryWikiPages.slug, slug),
        ];

        if (version !== undefined) {
          conditions.push(eq(repositoryWikiPages.version, version));
        }

        // Get the page first to increment the correct version
        const query = db
          .select({ id: repositoryWikiPages.id, viewCount: repositoryWikiPages.viewCount })
          .from(repositoryWikiPages)
          .where(and(...conditions));

        const result = version === undefined
          ? await query.orderBy(desc(repositoryWikiPages.version)).limit(1)
          : await query;

        if (result.length === 0) {
          return { success: false };
        }

        await db
          .update(repositoryWikiPages)
          .set({
            viewCount: result[0].viewCount + 1,
          })
          .where(eq(repositoryWikiPages.id, result[0].id));

        return { success: true };
      } catch (error) {
        console.error('Failed to increment view count:', error);
        return { success: false };
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
        // Check if user has write access to the repository
        const { createGitHubServiceForUserOperations } = await import('@/lib/github');
        const githubService = await createGitHubServiceForUserOperations(ctx.session);

        // Get repository details with permissions
        const { data: repoData } = await githubService['octokit'].repos.get({
          owner,
          repo,
        });

        // Check if user has admin or push (write) permissions
        const hasAccess = repoData.permissions?.admin || repoData.permissions?.push;

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete wiki pages for this repository',
          });
        }

        // Delete all wiki pages for this repository
        const deletedPages = await db
          .delete(repositoryWikiPages)
          .where(
            and(
              eq(repositoryWikiPages.repoOwner, owner),
              eq(repositoryWikiPages.repoName, repo)
            )
          )
          .returning();

        return {
          success: true,
          deletedCount: deletedPages.length,
        };
      } catch (error) {
        console.error('Failed to delete repository wiki:', error);

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
