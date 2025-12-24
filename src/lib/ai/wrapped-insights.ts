import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
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
});

export type GenerateWrappedInsightsParams = {
  username: string;
  stats: WrappedStats;
  rawData: WrappedRawData;
  year: number;
  includeRoast?: boolean;
};

export type GenerateWrappedInsightsResult = {
  insights: WrappedAIInsights;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export async function generateWrappedInsights({
  username,
  stats,
  rawData,
  year,
  includeRoast = false,
}: GenerateWrappedInsightsParams): Promise<GenerateWrappedInsightsResult> {
  const prompt = buildPrompt(username, stats, rawData, year, includeRoast);

  const { object, usage } = await generateObject({
    model: google('gemini-2.0-flash'),
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
  const commitMessages = rawData.commits.slice(0, 500).map(c => 
    `[${c.repo}] ${c.message.split('\n')[0]}`
  ).join('\n');

  const prTitles = rawData.pullRequests.slice(0, 100).map(pr =>
    `[${pr.repo}] ${pr.title} ${pr.merged ? '✓' : '○'}`
  ).join('\n');

  const topLang = stats.languages[0]?.name || 'Unknown';
  const peakHourFormatted = formatHour(stats.peakHour);

  return `You are an expert developer analyst creating a GitHub Wrapped ${year} report. 
You have access to this developer's ACTUAL commit messages and PR titles - analyze them deeply.

DEVELOPER: ${username}
YEAR: ${year}

=== RAW COMMIT MESSAGES (${rawData.commits.length} total) ===
${commitMessages}

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

BE SPECIFIC. Reference actual commit messages you see. Make this feel personalized, not generic.`;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}
