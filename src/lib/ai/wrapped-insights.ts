import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';
import type { WrappedStats, WrappedAIInsights } from '@/db/schema/wrapped';
import type { WrappedRawData } from '@/lib/github/wrapped-service';

const wrappedInsightsSchema = z.object({
  personalityType: z.string(),
  personalityDescription: z.string(),
  personalityEmoji: z.string(),
  yearSummary: z.string(),
  biggestWin: z.string().nullable(),
  topProjects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    impact: z.string(),
  })).nullable(),
  codingJourney: z.string().nullable(),
  commitMessageAnalysis: z.object({
    style: z.string(),
    commonThemes: z.array(z.string()),
    funFact: z.string(),
  }).nullable(),
  traumaEvent: z.string().nullable(),
  roast: z.string().nullable(),
  prediction2025: z.string().nullable(),
  overallGrade: z.string().nullable(),
  gradeDescription: z.string().nullable(),
  shamefulCommit: z.object({
    message: z.string(),
    repo: z.string(),
    reason: z.string(),
  }).nullable().optional(),
});

export type GenerateWrappedInsightsParams = {
  username: string;
  stats: WrappedStats;
  rawData: WrappedRawData;
  year: number;
  includeRoast?: boolean;
  apiKey?: string; // Optional custom API key (BYOK)
};

export type GenerateWrappedInsightsResult = {
  insights: WrappedAIInsights;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export async function* generateWrappedInsightsStreaming({
  username,
  stats,
  rawData,
  year,
  includeRoast = false,
  apiKey,
}: GenerateWrappedInsightsParams): AsyncGenerator<{
  type: 'progress' | 'complete' | 'stream';
  progress?: number;
  message?: string;
  text?: string;
  metadata?: { type: string; insight?: string };
  result?: GenerateWrappedInsightsResult;
}> {
  // Create model - use custom API key if provided (BYOK), otherwise use default
  const googleProvider = apiKey
    ? createGoogleGenerativeAI({ apiKey })
    : google;
  const model = googleProvider('gemini-2.0-flash');
  // Pre-analysis insights
  const sampleCommits = rawData.commits.slice(0, 10);
  const interestingCommits = sampleCommits.filter(c => {
    const msg = c.message.toLowerCase();
    return msg.length > 50 || msg.includes('refactor') || msg.includes('feature') || msg.includes('fix');
  }).slice(0, 3);

  yield {
    type: 'progress',
    progress: 0,
    message: '🧠 Feeding your commit history to the AI brain...',
    metadata: { type: 'init' },
  };

  yield {
    type: 'progress',
    progress: 10,
    message: `📚 Analyzing ${rawData.commits.length} commits and ${rawData.pullRequests.length} PRs...`,
    metadata: {
      type: 'analysis',
      insight: stats.topRepos.length > 0 ? `Noticing patterns in ${stats.topRepos.slice(0, 2).map(r => r.name).join(' and ')}...` : undefined,
    },
  };

  // Analyze some interesting commits
  if (interestingCommits.length > 0) {
    const randomCommit = interestingCommits[Math.floor(Math.random() * interestingCommits.length)];
    yield {
      type: 'progress',
      progress: 20,
      message: `🔍 Spotted an interesting commit: "${randomCommit.message.split('\n')[0].slice(0, 60)}..."`,
      metadata: {
        type: 'insight',
        insight: `from ${randomCommit.repo}`,
      },
    };
  }

  yield {
    type: 'progress',
    progress: 30,
    message: '🤖 Starting AI analysis... Streaming response...',
    metadata: { type: 'ai_processing' },
  };

  // Build prompt for streaming - ask for JSON output
  const prompt = buildPrompt(username, stats, rawData, year, includeRoast);
  const streamingPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object that matches the schema. Do not include markdown code blocks, explanations, or any text outside the JSON object.`;

  // Use streamText to actually stream the AI response
  const result = streamText({
    model,
    messages: [{ role: 'user', content: streamingPrompt }],
  });

  let accumulatedText = '';
  let lastInsight: string | null = null;
  let progressValue = 30;

  // Stream actual AI tokens as they come in
  for await (const chunk of result.textStream) {
    accumulatedText += chunk;
    progressValue = Math.min(progressValue + 0.3, 95);

    // Yield the actual streamed text chunk
    yield {
      type: 'stream',
      progress: progressValue,
      text: chunk,
      message: '🤖 AI is analyzing...',
      metadata: { type: 'streaming' },
    };

    // Try to extract insights incrementally from partial JSON
    try {
      // Look for JSON object structure
      const jsonMatch = accumulatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const potentialJson = jsonMatch[0];
        try {
          const parsed = JSON.parse(potentialJson) as Partial<WrappedAIInsights>;
          
          // Extract insights as they appear in the JSON
          if (parsed.personalityType && parsed.personalityEmoji && lastInsight !== 'personality') {
            yield {
              type: 'progress',
              progress: 85,
              message: `✨ ${parsed.personalityEmoji} Discovered: You're a ${parsed.personalityType}!`,
              metadata: {
                type: 'discovery',
                insight: parsed.overallGrade ? `Grade: ${parsed.overallGrade}` : undefined,
              },
            };
            lastInsight = 'personality';
          }

          if (parsed.commitMessageAnalysis?.commonThemes && parsed.commitMessageAnalysis.commonThemes.length > 0 && lastInsight !== 'themes') {
            yield {
              type: 'progress',
              progress: 70,
              message: `💡 Commit themes: ${parsed.commitMessageAnalysis.commonThemes.slice(0, 3).join(', ')}`,
              metadata: { type: 'insight' },
            };
            lastInsight = 'themes';
          }

          if (parsed.topProjects && parsed.topProjects.length > 0 && lastInsight !== 'projects') {
            yield {
              type: 'progress',
              progress: 75,
              message: `🚀 Top projects: ${parsed.topProjects.slice(0, 2).map(p => p.name).join(', ')}`,
              metadata: { type: 'insight' },
            };
            lastInsight = 'projects';
          }
        } catch {
          // JSON not complete yet, continue streaming
        }
      }
    } catch {
      // Continue streaming
    }
  }

  // Get final result with usage stats
  const finalResult = await result;
  const usageResult = await finalResult.usage;
  const usage = usageResult || { inputTokens: 0, outputTokens: 0 };

  // Parse final JSON
  let insights: WrappedAIInsights;
  try {
    const jsonMatch = accumulatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    insights = wrappedInsightsSchema.parse(parsed) as WrappedAIInsights;
  } catch (parseError) {
    // If streaming JSON parse failed, fall back to generateObject
    console.warn('Failed to parse streamed JSON, falling back to generateObject', parseError);
    const { object, usage: fallbackUsage } = await generateObject({
      model,
      schema: wrappedInsightsSchema,
      messages: [{ role: 'user', content: streamingPrompt }],
    });
    insights = object as WrappedAIInsights;
    // Use fallback usage if streaming failed
    if (fallbackUsage) {
      usage.inputTokens = fallbackUsage.inputTokens || 0;
      usage.outputTokens = fallbackUsage.outputTokens || 0;
    }
  }

  yield {
    type: 'complete',
    progress: 100,
    result: {
      insights,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
      },
    },
  };
}

export async function generateWrappedInsights({
  username,
  stats,
  rawData,
  year,
  includeRoast = false,
  apiKey,
}: GenerateWrappedInsightsParams): Promise<GenerateWrappedInsightsResult> {
  // Create model - use custom API key if provided (BYOK), otherwise use default
  const googleProvider = apiKey
    ? createGoogleGenerativeAI({ apiKey })
    : google;
  const model = googleProvider('gemini-2.0-flash');

  const prompt = buildPrompt(username, stats, rawData, year, includeRoast);

  const { object, usage } = await generateObject({
    model,
    schema: wrappedInsightsSchema,
    messages: [{ role: 'user', content: prompt }],
  });

  return {
    insights: object as WrappedAIInsights,
    usage: {
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
    },
  };
}

function buildPrompt(
  username: string, 
  stats: WrappedStats, 
  rawData: WrappedRawData, 
  year: number, 
  includeRoast: boolean
): string {
  // Sample commits intelligently: take from beginning, middle, and end of year
  // This gives better representation than just first 500
  const totalCommits = rawData.commits.length;
  const sampleSize = Math.min(150, totalCommits); // Reduced from 500 to 150
  const sampledCommits: typeof rawData.commits = [];
  
  if (totalCommits <= sampleSize) {
    sampledCommits.push(...rawData.commits);
  } else {
    // Take from beginning, middle, and end
    const third = Math.floor(totalCommits / 3);
    sampledCommits.push(...rawData.commits.slice(0, Math.floor(sampleSize / 3)));
    sampledCommits.push(...rawData.commits.slice(third, third + Math.floor(sampleSize / 3)));
    sampledCommits.push(...rawData.commits.slice(-Math.floor(sampleSize / 3)));
  }
  
  const commitMessages = sampledCommits.map(c => 
    `[${c.repo}] ${c.message.split('\n')[0]}`
  ).join('\n');

  // Only send the MOST suspicious commits with diffs (reduced from 20 to 5)
  // Prioritize by: shortest messages, lazy patterns, then take top 5
  const commitsWithDiffs = rawData.commits
    .filter(c => c.diff)
    .sort((a, b) => {
      // Sort by message length (shorter = more suspicious) and lazy patterns
      const aMsg = a.message.trim().toLowerCase();
      const bMsg = b.message.trim().toLowerCase();
      const lazyPatterns = ['fix', 'update', 'wip', 'temp', 'test', 'stuff'];
      const aIsLazy = lazyPatterns.some(p => aMsg === p || aMsg.length <= 5);
      const bIsLazy = lazyPatterns.some(p => bMsg === p || bMsg.length <= 5);
      
      if (aIsLazy && !bIsLazy) return -1;
      if (!aIsLazy && bIsLazy) return 1;
      return a.message.length - b.message.length;
    })
    .slice(0, 5); // Only top 5 most suspicious
    
  const commitDiffsSection = commitsWithDiffs.length > 0
    ? `\n=== COMMIT DIFFS FOR ANALYSIS (${commitsWithDiffs.length} most suspicious commits) ===
Analyze these actual code changes to identify truly shameful commits. Look for:
- Vague commit messages with significant code changes
- Commented-out code, debug statements, or temporary hacks
- Inconsistent formatting or obvious copy-paste
- Missing tests for complex changes
- Security issues or credential leaks
- AI-generated patterns without review

${commitsWithDiffs.map(c => `
--- COMMIT: [${c.repo}] "${c.message.split('\n')[0]}" ---
${c.diff ? c.diff.slice(0, 2000) : 'No diff available'}${c.diff && c.diff.length > 2000 ? '... (truncated)' : ''}
`).join('\n\n')}`
    : '';

  const prTitles = rawData.pullRequests.slice(0, 50).map(pr => // Reduced from 100 to 50
    `[${pr.repo}] ${pr.title} ${pr.merged ? '✓' : '○'}`
  ).join('\n');

  const topLang = stats.languages[0]?.name || 'Unknown';
  const peakHourFormatted = formatHour(stats.peakHour);

  return `You are an expert developer analyst creating a GitHub Wrapped ${year} report. 
You have access to this developer's ACTUAL commit messages and PR titles - analyze them deeply.

DEVELOPER: ${username}
YEAR: ${year}

=== RAW COMMIT MESSAGES (sampled ${sampledCommits.length} of ${rawData.commits.length} total) ===
${commitMessages}
${commitDiffsSection}

=== PULL REQUESTS (${rawData.pullRequests.length} total, ${rawData.totalStats.prsMerged} merged) ===
${prTitles}

=== COMPUTED STATS ===
- Total commits: ${stats.totalCommits}
- Total PRs: ${stats.totalPRs} (${stats.totalPRsMerged} merged)
- Top language: ${topLang}
- Languages used: ${stats.languages.map(l => l.name).join(', ')}
- Top repos: ${stats.topRepos.map(r => `${r.name} (${r.commits} commits)`).join(', ')}
- Peak coding hour: ${peakHourFormatted}
- Peak day: ${stats.peakDay}
- Longest streak: ${stats.longestStreak} days
- Late night commits (12am-5am): ${stats.lateNightCommits}
- Weekend commits: ${stats.weekendCommits}

=== YOUR TASK ===
Analyze the ACTUAL commit messages and PR titles to understand:
1. What this developer actually BUILT this year
2. Their coding patterns and style
3. The evolution of their work
4. Notable projects and achievements

DO NOT just make up generic insights. Reference SPECIFIC commits and PRs you see in the data.

RESPONSE REQUIREMENTS:

1. **personalityType**: Pick a developer archetype that fits their actual work patterns
2. **personalityDescription**: 2-3 sentences based on REAL patterns you see in their commits
3. **personalityEmoji**: Single emoji that represents them
4. **yearSummary**: 3-4 sentences summarizing what they actually built this year. Be specific!
5. **biggestWin**: Their most impressive achievement based on commits/PRs you can see
6. **topProjects**: Analyze their top 3 repos - what were they building? What's the impact?
7. **codingJourney**: How did their work evolve through the year? Any pivots or new technologies?
8. **commitMessageAnalysis**: 
   - style: Are they verbose? Terse? Use conventional commits?
   - commonThemes: What words/patterns appear often?
   - funFact: Something interesting about their commit style
9. **traumaEvent**: Find something funny/concerning in the data (marathon sessions, rage commits, etc.)
10. ${includeRoast ? '**roast**: A playful roast based on their ACTUAL commits (reference specific ones!)' : '**roast**: null'}
11. **prediction2025**: Based on their trajectory, what will they work on next year?
12. **overallGrade**: A-F based on activity and quality
13. **gradeDescription**: Justify the grade with specifics
14. **shamefulCommit**: Based on the commit diffs you analyzed, identify the MOST shameful commit. Look at actual code changes, not just message length. Consider:
    - Vague messages with significant changes
    - Debug code, commented-out code, or temporary hacks left in
    - Security issues or bad practices
    - The actual code quality, not just the message
    Return an object with: message (the commit message), repo (repository name), reason (why it's shameful based on the CODE, not just the message)

BE SPECIFIC. Reference actual commit messages and code changes you see. Make this feel personalized, not generic.`;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}
