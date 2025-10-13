import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const commitAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  slopRanking: z.number().min(0).max(100).describe('How "sloppy" or low-quality is this commit? 0 = excellent, 100 = pure slop'),
  summary: z.string(),
  commitMessageQuality: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
  codeQuality: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    strengths: z.array(z.string()),
  }),
  aiGeneratedLikelihood: z.object({
    score: z.number().min(0).max(100).describe('Likelihood this was AI-generated without review (0-100)'),
    indicators: z.array(z.string()),
  }),
  bestPractices: z.object({
    score: z.number().min(0).max(100),
    violations: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  howToFix: z.array(z.object({
    issue: z.string(),
    solution: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
  emoji: z.string(),
});

export type CommitAnalysisResult = z.infer<typeof commitAnalysisSchema>;

export interface CommitAnalysisParams {
  commitMessage: string;
  commitSha: string;
  author: {
    name: string;
    email: string;
  };
  changedFiles: Array<{
    filename: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
  repoName: string;
  branch: string;
}

export interface CommitAnalysisResponse {
  analysis: CommitAnalysisResult;
  markdown: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Analyze a commit and provide detailed insights
 */
export async function analyzeCommit({
  commitMessage,
  commitSha,
  author,
  changedFiles,
  repoName,
  branch,
}: CommitAnalysisParams): Promise<CommitAnalysisResponse> {
  try {
    const prompt = `You are an expert code reviewer specializing in commit quality analysis. Analyze this commit and provide brutal honest insights.

COMMIT DETAILS:
Repository: ${repoName}
Branch: ${branch}
SHA: ${commitSha}
Author: ${author.name} <${author.email}>
Message: ${commitMessage}
Files Changed: ${changedFiles.length}

REQUIREMENTS:
- Provide an overall quality score from 0-100
- Calculate a "SLOP RANKING" (0 = pristine code, 100 = complete garbage)
  * High slop indicators: vague commit messages, no tests, obvious AI generation patterns, commented-out code, inconsistent formatting
  * Low slop indicators: clear intent, good tests, thoughtful changes, follows conventions
- Analyze commit message quality (is it descriptive? follows conventions?)
- Detect if this looks AI-generated without human review
- Identify code quality issues and best practice violations
- Provide specific, actionable "How to Fix" recommendations
- Choose an emoji to represent commit quality (🚀, ✅, ⚠️, 🔴, 💩)

BE HONEST: If it's slop, call it out. If it's good, praise it. Be direct.

CHANGED FILES AND PATCHES:
${changedFiles.slice(0, 10).map(file => `
--- ${file.filename} (+${file.additions}/-${file.deletions}) ---
${file.patch ? file.patch.slice(0, 2000) : 'Binary file or no patch available'}
`).join('\n')}

Your response must be a valid JSON object following the schema provided.`;

    const { object, usage } = await generateObject({
      model: google('models/gemini-2.5-pro'),
      schema: commitAnalysisSchema,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const markdown = formatCommitAnalysisAsMarkdown(object, commitMessage, commitSha, repoName);

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
    console.error('Commit Analysis error:', error);
    throw error;
  }
}

/**
 * Format commit analysis as a markdown comment
 */
function formatCommitAnalysisAsMarkdown(
  analysis: CommitAnalysisResult,
  commitMessage: string,
  commitSha: string,
  repoName: string
): string {
  const slopEmoji = analysis.slopRanking < 20 ? '🏆' : analysis.slopRanking < 40 ? '✅' : analysis.slopRanking < 60 ? '⚠️' : analysis.slopRanking < 80 ? '🔴' : '💩';

  return `## ${analysis.emoji} gh.gg Commit Analysis

**Commit:** \`${commitSha.slice(0, 7)}\`
**Overall Score: ${analysis.overallScore}/100**
**${slopEmoji} Slop Ranking: ${analysis.slopRanking}/100** ${analysis.slopRanking < 30 ? '(Clean!)' : analysis.slopRanking < 60 ? '(Meh)' : '(Pure Slop)'}

${analysis.summary}

---

### 📊 Analysis Breakdown

#### 💬 Commit Message Quality (${analysis.commitMessageQuality.score}/100)

${analysis.commitMessageQuality.issues.length > 0 ? `**⚠️ Issues:**
${analysis.commitMessageQuality.issues.map(i => `- ${i}`).join('\n')}

` : '✅ Good commit message.'}${analysis.commitMessageQuality.suggestions.length > 0 ? `**💡 Suggestions:**
${analysis.commitMessageQuality.suggestions.map(s => `- ${s}`).join('\n')}

` : ''}

#### 🎨 Code Quality (${analysis.codeQuality.score}/100)

${analysis.codeQuality.strengths.length > 0 ? `**✅ Strengths:**
${analysis.codeQuality.strengths.map(s => `- ${s}`).join('\n')}

` : ''}${analysis.codeQuality.issues.length > 0 ? `**⚠️ Issues:**
${analysis.codeQuality.issues.map(i => `- ${i}`).join('\n')}` : '✅ No major issues.'}

#### 🤖 AI Generation Likelihood (${analysis.aiGeneratedLikelihood.score}/100)

${analysis.aiGeneratedLikelihood.score > 60 ? '⚠️ High likelihood of AI-generated code without review!' : analysis.aiGeneratedLikelihood.score > 30 ? '🤔 Some AI patterns detected' : '✅ Looks human-crafted'}

${analysis.aiGeneratedLikelihood.indicators.length > 0 ? `**Indicators:**
${analysis.aiGeneratedLikelihood.indicators.map(i => `- ${i}`).join('\n')}

` : ''}

#### 📋 Best Practices (${analysis.bestPractices.score}/100)

${analysis.bestPractices.violations.length > 0 ? `**❌ Violations:**
${analysis.bestPractices.violations.map(v => `- ${v}`).join('\n')}

` : '✅ Following best practices.'}${analysis.bestPractices.recommendations.length > 0 ? `**💡 Recommendations:**
${analysis.bestPractices.recommendations.map(r => `- ${r}`).join('\n')}

` : ''}

---

### 🔧 How to Fix

${analysis.howToFix.length > 0 ? analysis.howToFix.map(fix => {
  const priorityEmoji = fix.priority === 'high' ? '🔴' : fix.priority === 'medium' ? '🟡' : '🟢';
  return `${priorityEmoji} **${fix.issue}**
→ ${fix.solution}`;
}).join('\n\n') : '✅ No critical fixes needed.'}

---

<sub>🤖 Powered by [gh.gg](https://gh.gg) | [Analyze your repos](https://gh.gg/${repoName})</sub>`;
}
