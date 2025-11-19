import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const issueAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  slopRanking: z.number().min(0).max(100).describe('How poorly written is this issue? 0 = excellent, 100 = pure slop'),
  summary: z.string(),
  clarity: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    strengths: z.array(z.string()),
  }),
  actionability: z.object({
    score: z.number().min(0).max(100),
    isReproducible: z.boolean(),
    hasStepsToReproduce: z.boolean(),
    hasExpectedBehavior: z.boolean(),
    suggestions: z.array(z.string()),
  }),
  completeness: z.object({
    score: z.number().min(0).max(100),
    missingInfo: z.array(z.string()),
    providedInfo: z.array(z.string()),
  }),
  aiGeneratedLikelihood: z.object({
    score: z.number().min(0).max(100).describe('Likelihood this was AI-generated without review (0-100)'),
    indicators: z.array(z.string()),
  }),
  suggestedLabels: z.array(z.string()).describe('Suggested labels for this issue (e.g., bug, enhancement, question, documentation)'),
  suggestedPriority: z.enum(['critical', 'high', 'medium', 'low']),
  duplicateLikelihood: z.object({
    score: z.number().min(0).max(100).describe('How likely this is a duplicate issue'),
    reasoning: z.string(),
  }),
  howToImprove: z.array(z.object({
    aspect: z.string(),
    suggestion: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
  emoji: z.string(),
});

export type IssueAnalysisResult = z.infer<typeof issueAnalysisSchema>;

export interface IssueAnalysisParams {
  issueTitle: string;
  issueBody: string;
  issueNumber: number;
  author: {
    login: string;
    type: string;
  };
  labels: string[];
  repoName: string;
  repoDescription?: string;
}

export interface IssueAnalysisResponse {
  analysis: IssueAnalysisResult;
  markdown: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Analyze a GitHub issue and provide detailed insights
 */
export async function analyzeIssue({
  issueTitle,
  issueBody,
  issueNumber,
  author,
  labels,
  repoName,
  repoDescription,
}: IssueAnalysisParams): Promise<IssueAnalysisResponse> {
  try {
    const prompt = `You are an expert issue triager specializing in GitHub issue quality analysis. Analyze this issue and provide brutally honest insights.

ISSUE DETAILS:
Repository: ${repoName}
${repoDescription ? `Repo Description: ${repoDescription}` : ''}
Issue #${issueNumber}
Author: ${author.login} (${author.type})
Current Labels: ${labels.length > 0 ? labels.join(', ') : 'None'}

TITLE:
${issueTitle}

BODY:
${issueBody || '(No description provided)'}

REQUIREMENTS:
- Provide an overall quality score from 0-100
- Calculate a "SLOP RANKING" (0 = pristine issue, 100 = complete garbage)
  * High slop indicators: vague title, no details, no steps to reproduce, demanding tone, obvious duplicates
  * Low slop indicators: clear title, detailed description, steps to reproduce, expected vs actual behavior, respectful tone
- Analyze clarity, actionability, completeness, AI generation likelihood, and duplicate likelihood (EACH scored 0-100)
  * 90-100: Excellent
  * 80-89: Good
  * 70-79: Acceptable
  * 60-69: Needs improvement
  * Below 60: Significant issues
- Assess actionability (can a developer act on this? is it reproducible?)
- Check completeness (what info is provided vs missing?)
- Detect if this looks AI-generated without human review (score 0-100, where 0 = human, 100 = definitely AI)
- Suggest appropriate labels (bug, enhancement, question, documentation, etc.)
- Recommend priority level (critical, high, medium, low)
- Estimate duplicate likelihood (score 0-100)
- Provide specific "How to Improve" recommendations
- Choose an emoji to represent issue quality (🚀, ✅, ⚠️, 🔴, 💩)

BE HONEST: If it's a poorly written issue, call it out. If it's excellent, praise it. Be direct.

Your response must be a valid JSON object following the schema provided.`;

    const { object, usage } = await generateObject({
      model: google('models/gemini-3-pro-preview'),
      schema: issueAnalysisSchema,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const markdown = formatIssueAnalysisAsMarkdown(object, issueNumber, repoName);

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
    console.error('Issue Analysis error:', error);
    throw error;
  }
}

/**
 * Format issue analysis as a markdown comment
 */
function formatIssueAnalysisAsMarkdown(
  analysis: IssueAnalysisResult,
  issueNumber: number,
  repoName: string
): string {
  const slopEmoji = analysis.slopRanking < 20 ? '🏆' : analysis.slopRanking < 40 ? '✅' : analysis.slopRanking < 60 ? '⚠️' : analysis.slopRanking < 80 ? '🔴' : '💩';
  const priorityEmoji = {
    critical: '🚨',
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  }[analysis.suggestedPriority];

  return `## ${analysis.emoji} gh.gg Issue Analysis

**Issue:** #${issueNumber}
**Overall Score: ${analysis.overallScore}/100**
**${slopEmoji} Slop Ranking: ${analysis.slopRanking}/100** ${analysis.slopRanking < 30 ? '(Excellent!)' : analysis.slopRanking < 60 ? '(Decent)' : '(Needs Work)'}
**${priorityEmoji} Suggested Priority: ${analysis.suggestedPriority}**

${analysis.summary}

---

### 📊 Analysis Breakdown

#### 📝 Clarity (${analysis.clarity.score}/100)

${analysis.clarity.strengths.length > 0 ? `**✅ Strengths:**
${analysis.clarity.strengths.map(s => `- ${s}`).join('\n')}

` : ''}${analysis.clarity.issues.length > 0 ? `**⚠️ Issues:**
${analysis.clarity.issues.map(i => `- ${i}`).join('\n')}

` : analysis.clarity.strengths.length === 0 ? '✅ Clear and well-written.\n\n' : ''}

#### ⚡ Actionability (${analysis.actionability.score}/100)

- **Reproducible:** ${analysis.actionability.isReproducible ? '✅ Yes' : '❌ No'}
- **Has Steps to Reproduce:** ${analysis.actionability.hasStepsToReproduce ? '✅ Yes' : '❌ No'}
- **Has Expected Behavior:** ${analysis.actionability.hasExpectedBehavior ? '✅ Yes' : '❌ No'}

${analysis.actionability.suggestions.length > 0 ? `**💡 Suggestions:**
${analysis.actionability.suggestions.map(s => `- ${s}`).join('\n')}

` : ''}

#### 📋 Completeness (${analysis.completeness.score}/100)

${analysis.completeness.providedInfo.length > 0 ? `**✅ Information Provided:**
${analysis.completeness.providedInfo.map(i => `- ${i}`).join('\n')}

` : ''}${analysis.completeness.missingInfo.length > 0 ? `**❌ Missing Information:**
${analysis.completeness.missingInfo.map(i => `- ${i}`).join('\n')}

` : analysis.completeness.providedInfo.length === 0 ? '✅ All necessary information provided.\n\n' : ''}

#### 🤖 AI Generation Likelihood (${analysis.aiGeneratedLikelihood.score}/100)

${analysis.aiGeneratedLikelihood.score > 60 ? '⚠️ High likelihood of AI-generated content without review!' : analysis.aiGeneratedLikelihood.score > 30 ? '🤔 Some AI patterns detected' : '✅ Looks human-written'}

${analysis.aiGeneratedLikelihood.indicators.length > 0 ? `**Indicators:**
${analysis.aiGeneratedLikelihood.indicators.map(i => `- ${i}`).join('\n')}

` : ''}

#### 🏷️ Suggested Labels

${analysis.suggestedLabels.length > 0 ? analysis.suggestedLabels.map(label => `\`${label}\``).join(' ') : 'None'}

#### 🔄 Duplicate Likelihood (${analysis.duplicateLikelihood.score}/100)

${analysis.duplicateLikelihood.reasoning}

---

### 🔧 How to Improve

${analysis.howToImprove.length > 0 ? analysis.howToImprove.map(improvement => {
  const priorityEmoji = improvement.priority === 'high' ? '🔴' : improvement.priority === 'medium' ? '🟡' : '🟢';
  return `${priorityEmoji} **${improvement.aspect}**
→ ${improvement.suggestion}`;
}).join('\n\n') : '✅ This is a well-written issue. No major improvements needed.'}

---

<sub>🤖 Powered by [gh.gg](https://github.gg) | [Analyze your repos](https://github.gg/${repoName})</sub>`;
}
