import { GoogleGenAI } from '@google/genai';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { scorecardSchema, type ScorecardData } from '@/lib/types/scorecard';

export interface RepoMetadata {
  description?: string | null;
  stars?: number;
  forks?: number;
  language?: string | null;
  topics?: string[];
}

export interface ScorecardAnalysisParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
  metadata?: RepoMetadata;
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
  metadata,
}: ScorecardAnalysisParams): Promise<ScorecardAnalysisResult> {
  try {
    // Build metadata context
    const metadataLines: string[] = [];
    if (metadata?.description) metadataLines.push(`Description: ${metadata.description}`);
    if (metadata?.language) metadataLines.push(`Primary Language: ${metadata.language}`);
    if (metadata?.stars !== undefined) metadataLines.push(`Stars: ${metadata.stars.toLocaleString()}`);
    if (metadata?.forks !== undefined) metadataLines.push(`Forks: ${metadata.forks.toLocaleString()}`);
    if (metadata?.topics?.length) metadataLines.push(`Topics: ${metadata.topics.join(', ')}`);

    const metadataSection = metadataLines.length > 0
      ? `\n${metadataLines.join('\n')}\n`
      : '';

    const prompt = `You are a senior software architect conducting a thorough code review. Analyze this repository and produce a comprehensive scorecard report.

REPOSITORY: ${repoName}${metadataSection}
FILES ANALYZED: ${files.length}

SCORING GUIDELINES:
- 90-100: Exceptional - Production-ready, comprehensive testing, excellent patterns, ready to scale
- 80-89: Strong - Solid foundation, minor improvements possible, good practices throughout
- 70-79: Good - Functional and maintainable, some gaps in testing or documentation
- 60-69: Adequate - Works but has notable technical debt or missing best practices
- 50-59: Needs Work - Significant issues affecting maintainability or reliability
- Below 50: Critical - Major architectural or quality issues requiring substantial refactoring

METRICS TO EVALUATE (select 5-7 most relevant to this codebase):
- Code Quality (readability, consistency, naming, patterns)
- Architecture (modularity, separation of concerns, scalability potential)
- Documentation (inline comments, README quality, API documentation)
- Error Handling (edge cases, validation, graceful degradation, error messages)
- Security (input validation, authentication patterns, secrets handling, OWASP concerns)
- Testing (coverage indicators, test quality, test patterns, testability)
- Performance (algorithmic efficiency, resource management, caching, optimization)
- Maintainability (complexity, coupling, cohesion, technical debt indicators)
- Type Safety (type coverage, strict mode usage, proper inference)
- Dependencies (currency, minimal footprint, appropriate choices, security)
- Developer Experience (setup ease, tooling, debugging support)

MARKDOWN REPORT STRUCTURE:
Write a thorough analysis that includes:

1. **Executive Summary** - 2-3 sentence overview for non-technical stakeholders
2. **Overall Score** with brief justification
3. **Business Impact** - How does this codebase affect:
   - Developer velocity and onboarding time
   - Production reliability and incident risk
   - Feature development speed
   - Technical debt burden
   - Scaling readiness
4. **Technical Deep Dive**
   - What patterns and practices stand out (good or bad)
   - Specific files or modules that need attention
   - Architecture decisions and their implications
5. **Strengths** - What this codebase does well (be specific, cite examples)
6. **Areas for Improvement** - Prioritized list of issues (high/medium/low impact)
7. **Actionable Recommendations** - Concrete next steps with estimated effort
8. **Risk Assessment** - What could go wrong if issues aren't addressed

Be thorough and specific. Reference actual file names and code patterns you observed. Write as much as needed to provide genuine value - this report should help developers understand what to prioritize.

OUTPUT FORMAT:
{
  "overallScore": number,
  "metrics": [{"metric": "Name", "score": number, "reason": "Specific justification with examples"}],
  "markdown": "Full markdown report following the structure above"
}

---

${files.map(file => `--- ${file.path} ---\n${file.content}`).join('\n\n')}`;

    const { object, usage } = await generateObject({
      model: google('models/gemini-3-pro-preview'),
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
