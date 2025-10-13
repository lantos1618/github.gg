import { GoogleGenAI } from '@google/genai';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { scorecardSchema, type ScorecardData } from '@/lib/types/scorecard';

export interface ScorecardAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
}

export interface ScorecardAnalysisResult {
  scorecard: ScorecardData;
  usage: {
    inputTokens: number;
    outputTokens: number;
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
- Identify 5-8 key metrics to evaluate (e.g., code quality, documentation, testing, security, performance, architecture, maintainability, feature completeness etc.)
- Score each metric from 0-100 based on the code quality, patterns, and best practices
- Provide a concise reason for each metric score
- In the markdown, instead of listing the metrics, write a **Business Impact** section that summarizes how the codebase's state affects business goals, developer velocity, onboarding, and risk. Make it actionable and human-readable for stakeholders.
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
  "markdown": "# 🏆 Repository Scorecard
    
    ## 📊 Overall Score: 85/100
    
    ### 💼 Business Impact
    - The codebase’s strong documentation and modular structure will accelerate onboarding for new developers.
    - Gaps in testing may increase the risk of production bugs, potentially impacting customer trust.
    - High code quality and clear architecture support rapid feature development and scalability.
    
    ### 🥇 Strengths
    - Excellent code organization
    
    ### ⚠️ Areas for Improvement
    - Could benefit from more tests
    
    ### 📝 Recommendations
    - Add comprehensive unit tests",
  "overallScore": 85
}

---

ANALYZE THESE FILES:
${files.map(file => `\n--- ${file.path} ---\n${file.content}`).join('\n')}`;

    const { object, usage } = await generateObject({
      model: google('models/gemini-2.5-pro'),
      schema: scorecardSchema,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    return {
      scorecard: object,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
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
