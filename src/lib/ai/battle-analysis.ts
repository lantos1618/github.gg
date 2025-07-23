import type { BattleCriteria } from '@/lib/types/arena';
import type { DeveloperProfile } from '@/lib/types/profile';
import { ELO_TIERS, K_FACTORS } from '@/lib/constants/arena';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export type BattleAnalysisParams = {
  challenger: {
    username: string;
    profile: DeveloperProfile;
  };
  opponent: {
    username: string;
    profile: DeveloperProfile;
  };
  criteria?: BattleCriteria[];
};

export type BattleAnalysisResult = {
  result: {
    winner: string;
    reason: string;
    challengerScore: {
      total: number;
      breakdown: Record<string, number>;
    };
    opponentScore: {
      total: number;
      breakdown: Record<string, number>;
    };
    highlights: string[];
    recommendations: string[];
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

const battleResultSchema = z.object({
  winner: z.string().describe("The GitHub username of the winner."),
  reason: z.string().describe("A detailed, evidence-based reason for the decision, comparing the two profiles based on the battle criteria."),
  challengerScore: z.object({
    total: z.number(),
    breakdown: z.record(z.string(), z.number()),
  }),
  opponentScore: z.object({
    total: z.number(),
    breakdown: z.record(z.string(), z.number()),
  }),
  highlights: z.array(z.string()).describe("Key strengths or notable achievements for both developers observed during the analysis."),
  recommendations: z.array(z.string()).describe("Actionable recommendations for both developers to improve their skills."),
});

/**
 * Analyze a battle between two developers based on their generated profiles.
 */
export async function analyzeBattle(
  challengerProfile: DeveloperProfile,
  opponentProfile: DeveloperProfile,
  challengerUsername: string,
  opponentUsername: string,
  criteria: BattleCriteria[]
): Promise<BattleAnalysisResult> {
  const prompt = `
    You are an expert AI judge for a developer code battle. Your task is to determine a winner based on a comparative analysis of two developer profiles.
    The battle is between '${challengerUsername}' (Challenger) and '${opponentUsername}' (Opponent).

    Analyze the provided JSON profiles for each developer and decide the winner based on these specific criteria: ${criteria.join(', ')}.

    Provide a detailed breakdown of your reasoning, assign scores for each criterion (1-10), and calculate a total score for each developer.
    Your entire output must be a single, valid JSON object that strictly adheres to the provided Zod schema.

    **Challenger Profile (${challengerUsername}):**
    ${JSON.stringify(challengerProfile, null, 2)}

    **Opponent Profile (${opponentUsername}):**
    ${JSON.stringify(opponentProfile, null, 2)}
  `;

  const { object, usage } = await generateObject({
    model: google('models/gemini-2.5-pro'),
    schema: battleResultSchema,
    messages: [{ role: 'user', content: prompt }],
  });

  return {
    result: object,
    usage: {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    },
  };
}

export function calculateEloChange(
  challengerRating: number,
  opponentRating: number,
  challengerWon: boolean
) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - challengerRating) / 400));
  const actualScore = challengerWon ? 1 : 0;
  
  const challengerKFactor = K_FACTORS.DEFAULT;
  const opponentKFactor = K_FACTORS.DEFAULT;
  
  const challengerChange = Math.round(challengerKFactor * (actualScore - expectedScore));
  const opponentChange = Math.round(opponentKFactor * (expectedScore - actualScore));
  
  return {
    challenger: {
      change: challengerChange,
      newRating: challengerRating + challengerChange,
    },
    opponent: {
      change: opponentChange,
      newRating: opponentRating + opponentChange,
    },
  };
}

export function determineTier(eloRating: number): string {
  for (const [, tier] of Object.entries(ELO_TIERS)) {
    if (eloRating >= tier.minRating) {
      return tier.name;
    }
  }
  return ELO_TIERS.BRONZE.name; // Default fallback
}

/**
 * Generate battle insights and recommendations
 */
export function generateBattleInsights(
  challengerProfile: DeveloperProfile,
  opponentProfile: DeveloperProfile,
  winner: string
): { highlights: string[]; recommendations: string[] } {
  const highlights = [
    `${winner} demonstrated exceptional technical skills`,
    'Strong focus on code quality and maintainability',
    'Excellent project organization and architecture'
  ];

  const recommendations = [
    'Continue improving test coverage',
    'Focus on performance optimization',
    'Enhance documentation practices'
  ];

  return { highlights, recommendations };
}

export function prepareRepositoriesForAnalysis(repos: Array<{ name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }>) {
  return repos
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map(repo => {
      const description = repo.description || 'No description';
      const language = repo.language || 'Unknown';
      const lastUpdated = new Date(repo.updated_at).toLocaleDateString();
      
      return `Repository: ${repo.name}
Description: ${description}
Language: ${language}
Stars: ${repo.stargazers_count}
Forks: ${repo.forks_count}
Last Updated: ${lastUpdated}
---`;
    })
    .join('\n\n');
} 