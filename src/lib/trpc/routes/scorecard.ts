import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db';
import { insightsCache } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/env';

// Initialize Google GenAI


// Debug: Log the API key being used (first few characters)

// Real Gemini function - returns a scorecard-style markdown with metrics, scores, and emojis
async function callGeminiForScorecard(files: Array<{ path: string; content: string }>, repoName: string): Promise<string> {


  console.log("GEMINI_API_KEY", env.GEMINI_API_KEY)
  const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
  });
  try {
    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      responseMimeType: 'text/plain',
    };

    // Create a comprehensive prompt for scorecard analysis
    const prompt = `You are an expert codebase analyst. Analyze the following repository files and create a beautiful, fun scorecard-style markdown report.

REPOSITORY: ${repoName}
FILES: ${files.length} files

REQUIREMENTS:
- Create a scorecard with an overall score out of 10
- Come up with relevant metrics to score (choose the most relevant metrics) (e.g., code quality, documentation, testing, security, performance, architecture, maintainability, etc.)
- Score each metric from 1-10 based on the code quality, patterns, and best practices
- Be honest but constructive in your assessment
- Use emojis throughout for visual appeal
- Keep it concise but informative
- Include specific strengths, areas for improvement, and actionable recommendations
- Use markdown formatting with headers, lists, and emphasis

FORMAT:
- Start with a title using 🏆 emoji
- Include overall score with 📊 emoji
- List metrics with 🔢 emoji
- Use 🥇 for strengths
- Use ⚠️ for areas to improve
- Use 📝 for recommendations
- End with a disclaimer


---

ANALYZE THESE FILES:
${files.map(file => `\n--- ${file.path} ---\n${file.content}`).join('\n')}`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
      ];
      
    // console.log("avaliable modles", await ai.models.list());
    const response = await ai.models.generateContentStream({
      model: "models/gemini-2.5-flash",
      config,
      contents,
    });

    let fullResponse = '';
    for await (const chunk of response) {
      fullResponse += chunk.text;
    }

    return fullResponse;
  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to mock data if API fails
    return `# 🏆 Project Scorecard: ${repoName}`;
  }
}

export const scorecardRouter = router({
  generateScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      files: z.array(z.object({
        path: z.string(),
        content: z.string(),
        size: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { repo, files } = input;
      
      try {
        // Generate scorecard using Gemini
        const markdownScorecard = await callGeminiForScorecard(files, repo);
        
        return {
          scorecard: markdownScorecard,
          cached: false,
          stale: false,
          lastUpdated: new Date(),
        };
      } catch (error) {
        console.error('Error generating scorecard:', error);
        throw new Error('Failed to generate repository scorecard');
      }
    }),

  getScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
    }))
    .query(async ({ input, ctx }) => {
      const { user, repo, ref } = input;
      
      // Check for cached scorecard
      const cached = await db
        .select()
        .from(insightsCache)
        .where(
          and(
            eq(insightsCache.userId, ctx.session!.user.id),
            eq(insightsCache.repoOwner, user),
            eq(insightsCache.repoName, repo),
            eq(insightsCache.ref, ref)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        const scorecard = cached[0];
        const isStale = new Date().getTime() - scorecard.updatedAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        
        return {
          scorecard: scorecard.insights,
          cached: true,
          stale: isStale,
          lastUpdated: scorecard.updatedAt,
        };
      }

      return {
        scorecard: null,
        cached: false,
        stale: false,
        lastUpdated: null,
      };
    }),

  cacheScorecard: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
      scorecard: z.any(), // The full scorecard object
    }))
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref, scorecard } = input;

      // Upsert scorecard cache
      await db
        .insert(insightsCache)
        .values({
          userId: ctx.session!.user.id,
          repoOwner: user,
          repoName: repo,
          ref,
          insights: scorecard,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [insightsCache.userId, insightsCache.repoOwner, insightsCache.repoName, insightsCache.ref],
          set: {
            insights: scorecard,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),

  clearCache: protectedProcedure
    .input(z.object({
      user: z.string(),
      repo: z.string(),
      ref: z.string().optional().default('main'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { user, repo, ref } = input;

      await db
        .delete(insightsCache)
        .where(
          and(
            eq(insightsCache.userId, ctx.session!.user.id),
            eq(insightsCache.repoOwner, user),
            eq(insightsCache.repoName, repo),
            eq(insightsCache.ref, ref)
          )
        );

      return { success: true };
    }),
});
