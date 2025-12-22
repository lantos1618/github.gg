import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { WrappedStats, WrappedAIInsights } from '@/db/schema/wrapped';

const wrappedInsightsSchema = z.object({
  personalityType: z.string(),
  personalityDescription: z.string(),
  personalityEmoji: z.string(),
  biggestWin: z.string().nullable(),
  traumaEvent: z.string().nullable(),
  roast: z.string().nullable(),
  prediction2025: z.string().nullable(),
  overallGrade: z.string().nullable(),
  gradeDescription: z.string().nullable(),
});

export type GenerateWrappedInsightsParams = {
  username: string;
  stats: WrappedStats;
  year: number;
  apiKey: string;
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

const PERSONALITY_TYPES = [
  { name: 'The Midnight Archaeologist', pattern: 'late nights + legacy code exploration', emoji: '🌙' },
  { name: 'The Documentation Evangelist', pattern: 'heavy on .md files and comments', emoji: '📚' },
  { name: 'The YOLO Deployer', pattern: 'Friday deploys + force pushes', emoji: '🚀' },
  { name: 'The Perfectionist', pattern: 'many small atomic commits', emoji: '✨' },
  { name: 'The Big Bang Theorist', pattern: 'few massive commits', emoji: '💥' },
  { name: 'The Social Butterfly', pattern: 'many collaborators', emoji: '🦋' },
  { name: 'The Lone Wolf', pattern: 'solo commits only', emoji: '🐺' },
  { name: 'The Polyglot', pattern: 'many languages', emoji: '🗣️' },
  { name: 'The Specialist', pattern: 'one language dominates', emoji: '🎯' },
  { name: 'The Streak Demon', pattern: 'long contribution streaks', emoji: '👹' },
  { name: 'The Weekend Warrior', pattern: 'weekend-heavy coding', emoji: '⚔️' },
  { name: 'The Corporate Soldier', pattern: '9-5 coding patterns', emoji: '💼' },
  { name: 'The Night Owl', pattern: 'peak hours after midnight', emoji: '🦉' },
  { name: 'The Early Bird', pattern: 'peak hours before 9am', emoji: '🐦' },
  { name: 'The Chaos Agent', pattern: 'random unpredictable patterns', emoji: '🎲' },
];

export async function generateWrappedInsights({
  username,
  stats,
  year,
  apiKey,
  includeRoast = false,
}: GenerateWrappedInsightsParams): Promise<GenerateWrappedInsightsResult> {
  const google = createGoogleGenerativeAI({ apiKey });

  const prompt = buildPrompt(username, stats, year, includeRoast);

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

function buildPrompt(username: string, stats: WrappedStats, year: number, includeRoast: boolean): string {
  const topLang = stats.languages[0]?.name || 'Unknown';
  const peakHourFormatted = formatHour(stats.peakHour);
  const lateNightPercentage = stats.totalCommits > 0 
    ? Math.round((stats.lateNightCommits / stats.totalCommits) * 100) 
    : 0;
  const weekendPercentage = stats.totalCommits > 0 
    ? Math.round((stats.weekendCommits / stats.totalCommits) * 100) 
    : 0;

  return `You are a witty, slightly unhinged developer personality analyst for GitHub Wrapped ${year}. 
Your tone is: self-aware, terminally online humor. Think developer Twitter meets corporate Memphis parody.
Be funny but not mean. Playful roasts, not insults.

DEVELOPER: ${username}
YEAR: ${year}

STATS:
- Total commits: ${stats.totalCommits}
- PRs opened: ${stats.totalPRs} (${stats.totalPRsMerged} merged)
- Issues opened: ${stats.totalIssues}
- Code reviews: ${stats.totalReviews}
- Lines added: ${stats.linesAdded.toLocaleString()}
- Lines deleted: ${stats.linesDeleted.toLocaleString()}
- Longest streak: ${stats.longestStreak} days
- Top language: ${topLang} (${stats.languages[0]?.percentage || 0}%)
- Other languages: ${stats.languages.slice(1, 4).map(l => l.name).join(', ') || 'None'}
- Peak coding hour: ${peakHourFormatted}
- Peak day: ${stats.peakDay}
- Late night commits (12am-5am): ${stats.lateNightCommits} (${lateNightPercentage}%)
- Weekend commits: ${stats.weekendCommits} (${weekendPercentage}%)
- Monday commits: ${stats.mondayCommits}
- Most used commit message: "${stats.mostUsedCommitMessage || 'N/A'}"
- Avg commit message length: ${stats.avgCommitMessageLength} chars
- Top repos: ${stats.topRepos.slice(0, 3).map(r => r.name).join(', ')}
- Top collaborators: ${stats.topCollaborators.slice(0, 3).map(c => c.username).join(', ') || 'Solo developer'}

PERSONALITY TYPES TO CHOOSE FROM:
${PERSONALITY_TYPES.map(p => `- ${p.name} (${p.emoji}): ${p.pattern}`).join('\n')}

INSTRUCTIONS:
1. Pick ONE personality type that best fits their coding patterns. Use the exact name and emoji from the list above.
2. Write a 1-2 sentence personality description that's specific to their stats (not generic).
3. Identify their "biggest win" - the most impressive stat or achievement.
4. Identify a "trauma event" - something funny/concerning in their data (mass deletions, marathon coding sessions, abandoned repos, etc.). If nothing stands out, set to null.
5. ${includeRoast ? 'Write a playful roast (2-3 sentences) about their coding habits. Be funny, not mean.' : 'Set roast to null (user did not opt in).'}
6. Write a fun prediction for ${year + 1} based on their patterns.
7. Give them an overall grade (A, B, C, D, or F) based on their activity level and patterns, with a brief explanation.

GRADING RUBRIC:
- A: 500+ commits, good collaboration, healthy patterns
- B: 200-500 commits, decent activity
- C: 50-200 commits, could be more active
- D: 10-50 commits, minimal activity
- F: <10 commits (but make it funny, not discouraging)

Remember: Be entertaining! This is meant to be shared on social media.`;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}
