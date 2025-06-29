import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/env';
import { parseGeminiError } from '@/lib/utils/errorHandling';

// Initialize Google GenAI client
const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

export interface ScorecardAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
}

/**
 * Generate a scorecard-style markdown analysis using Gemini AI
 */
export async function generateScorecardAnalysis({
  files,
  repoName,
}: ScorecardAnalysisParams): Promise<string> {
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
    const userFriendlyMessage = parseGeminiError(error);
    throw new Error(userFriendlyMessage);
  }
}

/**
 * Get available Gemini models (for debugging/development)
 */
export async function getAvailableModels() {
  try {
    return await ai.models.list();
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
} 