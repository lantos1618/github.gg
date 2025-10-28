import { NextRequest } from 'next/server';
import { createPublicGitHubService } from '@/lib/github';
import { generateWikiWithCacheStreaming } from '@/lib/ai/wiki-generator-streaming';
import { db } from '@/db';
import { tokenUsage, repositoryWikiPages } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const ownerParam = searchParams.get('owner');
  const repoParam = searchParams.get('repo');
  const maxFilesParam = parseInt(searchParams.get('maxFiles') || '200');
  const maxFiles = Math.min(Math.max(maxFilesParam, 1), 1000); // Clamp between 1-1000

  if (!ownerParam || !repoParam) {
    return new Response('Missing owner or repo', { status: 400 });
  }

  // Store as non-nullable strings for use in nested scopes
  const owner: string = ownerParam;
  const repo: string = repoParam;

  // Check authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        sendEvent('progress', { status: 'initializing', progress: 0, message: 'Starting wiki generation...' });

        const githubService = createPublicGitHubService();

        // Fetch metadata
        sendEvent('progress', { status: 'fetching_metadata', progress: 5, message: 'Fetching repository metadata...' });

        const [repoData, readmeResult, packageJsonResult] = await Promise.allSettled([
          githubService['octokit'].repos.get({ owner, repo }),
          githubService['octokit'].repos.getReadme({ owner, repo }),
          githubService['octokit'].repos.getContent({ owner, repo, path: 'package.json' }),
        ]);

        if (repoData.status === 'rejected') {
          throw new Error('Failed to fetch repository data');
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

        // Collect files
        sendEvent('progress', { status: 'collecting_files', progress: 10, message: 'Collecting source files...' });

        const files: Array<{
          path: string;
          content: string;
          language: string;
          size: number;
        }> = [];

        async function collectFiles(filePath: string, depth = 0): Promise<void> {
          if (depth > 3 || files.length >= maxFiles) return;

          try {
            const items = await githubService['octokit'].repos.getContent({
              owner,
              repo,
              path: filePath
            });
            if (!Array.isArray(items.data)) return;

            const fileItems: typeof items.data = [];
            const dirItems: typeof items.data = [];

            for (const item of items.data) {
              if (files.length >= maxFiles) break;
              if (!item.path) continue; // Skip items without paths

              if (item.type === 'file') {
                const ext = item.name.split('.').pop()?.toLowerCase();
                const sourceExts = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h'];

                if (ext && sourceExts.includes(ext) && item.size && item.size < 100000) {
                  fileItems.push(item);
                }
              } else if (item.type === 'dir' && !item.path.includes('node_modules') && !item.path.includes('.git')) {
                dirItems.push(item);
              }
            }

            // Update progress during file collection
            const currentProgress = 10 + (files.length / maxFiles) * 15;
            sendEvent('progress', {
              status: 'collecting_files',
              progress: currentProgress,
              message: `Collected ${files.length}/${maxFiles} files...`
            });

            // Fetch files in parallel
            const chunkSize = 10;
            for (let i = 0; i < fileItems.length; i += chunkSize) {
              if (files.length >= maxFiles) break;

              const chunk = fileItems.slice(i, i + chunkSize);
              const fileResults = await Promise.allSettled(
                chunk.map(item =>
                  githubService['octokit'].repos.getContent({ owner, repo, path: item.path })
                )
              );

              for (let j = 0; j < fileResults.length; j++) {
                if (files.length >= maxFiles) break;

                const result = fileResults[j];
                if (result.status === 'fulfilled' && 'content' in result.value.data) {
                  const item = chunk[j];
                  const content = Buffer.from(result.value.data.content, 'base64').toString('utf-8');
                  const ext = item.name.split('.').pop()?.toLowerCase() || '';

                  files.push({
                    path: item.path,
                    content,
                    language: ext,
                    size: item.size || 0,
                  });
                }
              }
            }

            // Recursively collect from directories
            const dirChunkSize = 5;
            for (let i = 0; i < dirItems.length; i += dirChunkSize) {
              if (files.length >= maxFiles) break;

              const chunk = dirItems.slice(i, i + dirChunkSize);
              await Promise.all(chunk.map(item => collectFiles(item.path, depth + 1)));
            }
          } catch (error) {
            console.error(`Failed to collect files from ${filePath}:`, error);
          }
        }

        await collectFiles('');

        sendEvent('progress', {
          status: 'files_collected',
          progress: 25,
          message: `Collected ${files.length} files`
        });

        // Generate wiki with streaming progress
        const wikiResult = await generateWikiWithCacheStreaming({
          owner,
          repo,
          repoDescription: repoData.value.data.description || undefined,
          primaryLanguage: repoData.value.data.language || undefined,
          files,
          packageJson,
          readme,
          onProgress: (progress) => {
            sendEvent('progress', progress);
          }
        });

        // Calculate file hashes
        const fileHashes: Record<string, string> = {};
        files.forEach(f => {
          fileHashes[f.path] = crypto.createHash('sha256').update(f.content).digest('hex');
        });

        // Get latest version
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

        sendEvent('progress', {
          status: 'saving',
          progress: 95,
          message: 'Saving wiki pages to database...'
        });

        // Insert pages
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
                systemPrompt: '',
                dependsOn: [],
                priority: 10 - index,
              },
              isPublic: true,
              viewCount: 0,
            }).returning()
          )
        );

        // Log token usage
        try {
          await db.insert(tokenUsage).values({
            userId: session.user.id,
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
          console.error('Failed to log token usage:', dbError);
        }

        sendEvent('complete', {
          status: 'completed',
          progress: 100,
          message: 'Wiki generation complete!',
          version: nextVersion,
          pages: insertedPages.map(p => p[0]),
          usage: wikiResult.usage,
        });

        controller.close();
      } catch (error) {
        console.error('Wiki generation error:', error);
        sendEvent('error', {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
