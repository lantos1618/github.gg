import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const scorecardSchema = z.object({
  scorecard: z.string(),
});

export interface ScorecardAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
}

export interface ScorecardAnalysisResult {
  scorecard: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate a scorecard-style markdown analysis using Gemini AI
 */
export async function generateScorecardAnalysis({
  files,
  repoName,
}: ScorecardAnalysisParams): Promise<ScorecardAnalysisResult> {
  try {
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

    const result = await generateText({
      model: google('models/gemini-2.5-flash'),
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    return {
      scorecard: result.text,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Get available Gemini models (for debugging/development)
 */
export async function getAvailableModels() {
  try {
    // Note: This would need to be updated if we switch to AI SDK
    // For now, keeping the original implementation
    const { GoogleGenAI } = await import('@google/genai');
    const { env } = await import('@/lib/env');
    
    const ai = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });
    
    return await ai.models.list();
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
} 