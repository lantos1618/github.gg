import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';

export const scorecardSchema = z.object({
  metrics: z.array(z.object({
    metric: z.string(),
    score: z.number(),
    reason: z.string(),
  })),
  markdown: z.string(),
  overallScore: z.number(),
});

export interface ScorecardAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
}

export interface ScorecardAnalysisResult {
  scorecard: {
    metrics: Array<{
      metric: string;
      score: number;
      reason: string;
    }>;
    markdown: string;
    overallScore: number;
  };
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
    const prompt = `You are an expert codebase analyst. Analyze the following repository files and create a structured scorecard analysis.

REPOSITORY: ${repoName}
FILES: ${files.length} files

REQUIREMENTS:
- Analyze the codebase and provide an overall score from 0-100
- Identify 5-8 key metrics to evaluate (e.g., code quality, documentation, testing, security, performance, architecture, maintainability, etc.)
- Score each metric from 0-100 based on the code quality, patterns, and best practices
- Provide a concise reason for each metric score
- Create a comprehensive markdown analysis with emojis and formatting
- Be honest but constructive in your assessment

Your response must be a valid JSON object with this exact structure:
{
  "metrics": [
    {
      "metric": "Code Quality",
      "score": 85,
      "reason": "Well-structured code with good naming conventions and consistent formatting"
    }
  ],
  "markdown": "# 🏆 Repository Scorecard\n\n## 📊 Overall Score: 85/100\n\n### 🔢 Metrics Breakdown\n- **Code Quality**: 85/100 - Well-structured code...\n\n### 🥇 Strengths\n- Excellent code organization\n\n### ⚠️ Areas for Improvement\n- Could benefit from more tests\n\n### 📝 Recommendations\n- Add comprehensive unit tests",
  "overallScore": 85
}

---

ANALYZE THESE FILES:
${files.map(file => `\n--- ${file.path} ---\n${file.content}`).join('\n')}`;

    const { object, usage } = await generateObject({
      model: google('models/gemini-2.5-flash'),
      schema: scorecardSchema,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    return {
      scorecard: object,
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
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
    
    // For now, keeping the original implementation
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    return await ai.models.list();
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
} 