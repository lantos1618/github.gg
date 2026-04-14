import { generateObject } from 'ai';
import { GEMINI_PRO } from './models';
import { z } from 'zod';

const prAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  codeQuality: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    strengths: z.array(z.string()),
  }),
  security: z.object({
    score: z.number().min(0).max(100),
    concerns: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  performance: z.object({
    score: z.number().min(0).max(100),
    concerns: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
  maintainability: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
  recommendations: z.array(z.string()),
  emoji: z.string(),
});

export type PRAnalysisResult = z.infer<typeof prAnalysisSchema>;

export interface PRAnalysisParams {
  prTitle: string;
  prDescription: string;
  changedFiles: Array<{
    filename: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
  repoName: string;
  baseBranch: string;
  headBranch: string;
}

export interface PRAnalysisResponse {
  analysis: PRAnalysisResult;
  markdown: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Analyze a pull request and generate insights
 */
export async function analyzePullRequest({
  prTitle,
  prDescription,
  changedFiles,
  repoName,
  baseBranch,
  headBranch,
}: PRAnalysisParams): Promise<PRAnalysisResponse> {
  try {
    const prompt = `You are an expert code reviewer. Analyze this pull request and provide detailed insights.

PULL REQUEST DETAILS:
Repository: ${repoName}
Title: ${prTitle}
Description: ${prDescription || 'No description provided'}
Base Branch: ${baseBranch}
Head Branch: ${headBranch}
Files Changed: ${changedFiles.length}

REQUIREMENTS:
- Provide an overall score from 0-100 for this PR
- Provide breakdown scores for code quality, security, performance, and maintainability (EACH also 0-100)
  * 90-100: Excellent
  * 80-89: Good
  * 70-79: Acceptable
  * 60-69: Needs improvement
  * Below 60: Significant issues
- The overall score should reflect a weighted average of the breakdown scores
- Be constructive and helpful
- Identify specific issues with line references when possible
- Suggest practical improvements
- Choose an appropriate emoji to represent the PR quality (🚀, ✅, ⚠️, or 🔴)

CHANGED FILES AND PATCHES:
${changedFiles.map(file => `
--- ${file.filename} (+${file.additions}/-${file.deletions}) ---
${file.patch || 'Binary file or no patch available'}
`).join('\n')}

Your response must be a valid JSON object following the schema provided.`;

    const { object, usage } = await generateObject({
      model: GEMINI_PRO,
      schema: prAnalysisSchema,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const markdown = formatPRAnalysisAsMarkdown(object, prTitle, repoName);

    return {
      analysis: object,
      markdown,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
      },
    };
  } catch (error) {
    console.error('PR Analysis error:', error);
    throw error;
  }
}

/**
 * Format PR analysis as a markdown comment
 */
function formatPRAnalysisAsMarkdown(analysis: PRAnalysisResult, prTitle: string, repoName: string): string {
  return `## ${analysis.emoji} gh.gg AI Code Review

**Overall Score: ${analysis.overallScore}/100**

${analysis.summary}

---

### 📊 Analysis Breakdown

#### 🎨 Code Quality (${analysis.codeQuality.score}/100)

${analysis.codeQuality.strengths.length > 0 ? `**✅ Strengths:**
${analysis.codeQuality.strengths.map(s => `- ${s}`).join('\n')}

` : ''}${analysis.codeQuality.issues.length > 0 ? `**⚠️ Issues:**
${analysis.codeQuality.issues.map(i => `- ${i}`).join('\n')}` : ''}

#### 🔒 Security (${analysis.security.score}/100)

${analysis.security.concerns.length > 0 ? `**⚠️ Concerns:**
${analysis.security.concerns.map(c => `- ${c}`).join('\n')}

` : '✅ No security concerns detected.'}${analysis.security.recommendations.length > 0 ? `
**💡 Recommendations:**
${analysis.security.recommendations.map(r => `- ${r}`).join('\n')}` : ''}

#### ⚡ Performance (${analysis.performance.score}/100)

${analysis.performance.concerns.length > 0 ? `**⚠️ Concerns:**
${analysis.performance.concerns.map(c => `- ${c}`).join('\n')}

` : '✅ No performance concerns detected.'}${analysis.performance.suggestions.length > 0 ? `
**💡 Suggestions:**
${analysis.performance.suggestions.map(s => `- ${s}`).join('\n')}` : ''}

#### 🔧 Maintainability (${analysis.maintainability.score}/100)

${analysis.maintainability.issues.length > 0 ? `**⚠️ Issues:**
${analysis.maintainability.issues.map(i => `- ${i}`).join('\n')}

` : '✅ Good maintainability.'}${analysis.maintainability.suggestions.length > 0 ? `
**💡 Suggestions:**
${analysis.maintainability.suggestions.map(s => `- ${s}`).join('\n')}` : ''}

---

### 🎯 Key Recommendations

${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

<sub>🤖 Powered by [gh.gg](https://github.gg) | [Analyze your repos](https://github.gg/${repoName})</sub>`;
}
