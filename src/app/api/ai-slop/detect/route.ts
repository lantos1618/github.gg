import { NextRequest } from 'next/server';
import { generateAISlopAnalysis } from '@/lib/ai/ai-slop';
import { db } from '@/db';
import { tokenUsage, aiSlopAnalyses } from '@/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  // Check authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const { user, repo, ref = 'main', files } = body;

  if (!user || !repo || !files || !Array.isArray(files)) {
    return new Response('Missing required fields', { status: 400 });
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
        sendEvent('progress', {
          status: 'initializing',
          progress: 0,
          message: 'Starting AI slop analysis...'
        });

        sendEvent('progress', {
          status: 'analyzing',
          progress: 10,
          message: `Analyzing ${files.length} files...`
        });

        // Generate AI slop analysis
        const result = await generateAISlopAnalysis({
          files,
          repoName: repo,
        });

        sendEvent('progress', {
          status: 'analysis_complete',
          progress: 80,
          message: 'Analysis complete, saving results...'
        });

        // Get next version number
        const maxVersionResult = await db
          .select({ max: sql<number | null>`COALESCE(MAX(version), 0)` })
          .from(aiSlopAnalyses)
          .where(
            and(
              eq(aiSlopAnalyses.userId, session.user.id),
              eq(aiSlopAnalyses.repoOwner, user),
              eq(aiSlopAnalyses.repoName, repo),
              eq(aiSlopAnalyses.ref, ref)
            )
          );

        const nextVersion = (maxVersionResult[0]?.max ?? 0) + 1;

        // Insert new analysis
        const [insertedRecord] = await db.insert(aiSlopAnalyses).values({
          userId: session.user.id,
          repoOwner: user,
          repoName: repo,
          ref,
          version: nextVersion,
          overallScore: result.analysis.overallScore,
          aiGeneratedPercentage: result.analysis.aiGeneratedPercentage,
          detectedPatterns: result.analysis.detectedPatterns,
          metrics: result.analysis.metrics,
          markdown: result.analysis.markdown,
          updatedAt: new Date(),
        }).returning();

        // Log token usage
        try {
          await db.insert(tokenUsage).values({
            userId: session.user.id,
            feature: 'ai-slop',
            repoOwner: user,
            repoName: repo,
            model: 'gemini-2.5-pro',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            totalTokens: result.usage.totalTokens,
            isByok: false,
          });
        } catch (dbError) {
          console.error('Failed to log token usage:', dbError);
        }

        sendEvent('complete', {
          status: 'completed',
          progress: 100,
          message: 'AI slop analysis complete!',
          analysis: {
            metrics: insertedRecord.metrics,
            markdown: insertedRecord.markdown,
            overallScore: insertedRecord.overallScore,
            aiGeneratedPercentage: insertedRecord.aiGeneratedPercentage,
            detectedPatterns: insertedRecord.detectedPatterns,
          },
          version: nextVersion,
          usage: result.usage,
        });

        controller.close();
      } catch (error) {
        console.error('AI slop analysis error:', error);
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
