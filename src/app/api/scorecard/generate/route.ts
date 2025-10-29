import { NextRequest } from 'next/server';
import { generateScorecardAnalysis } from '@/lib/ai/scorecard';
import { db } from '@/db';
import { tokenUsage, scorecardAnalyses } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
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
          message: 'Starting scorecard analysis...'
        });

        sendEvent('progress', {
          status: 'analyzing',
          progress: 10,
          message: `Analyzing ${files.length} files...`
        });

        // Generate scorecard analysis
        const result = await generateScorecardAnalysis({
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
          .from(scorecardAnalyses)
          .where(
            and(
              eq(scorecardAnalyses.userId, session.user.id),
              eq(scorecardAnalyses.repoOwner, user),
              eq(scorecardAnalyses.repoName, repo),
              eq(scorecardAnalyses.ref, ref)
            )
          );

        const nextVersion = (maxVersionResult[0]?.max ?? 0) + 1;

        // Insert new analysis
        const [insertedRecord] = await db.insert(scorecardAnalyses).values({
          userId: session.user.id,
          repoOwner: user,
          repoName: repo,
          ref,
          version: nextVersion,
          overallScore: result.scorecard.overallScore,
          metrics: result.scorecard.metrics,
          markdown: result.scorecard.markdown,
          updatedAt: new Date(),
        }).returning();

        // Log token usage
        try {
          await db.insert(tokenUsage).values({
            userId: session.user.id,
            feature: 'scorecard',
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
          message: 'Scorecard analysis complete!',
          scorecard: {
            metrics: insertedRecord.metrics,
            markdown: insertedRecord.markdown,
            overallScore: insertedRecord.overallScore,
          },
          version: nextVersion,
          usage: result.usage,
        });

        controller.close();
      } catch (error) {
        console.error('Scorecard analysis error:', error);
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
