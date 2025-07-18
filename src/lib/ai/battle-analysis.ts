import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import type { RepoSummary } from '@/lib/github';
import type { DeveloperProfile } from '@/lib/types/profile';
import type { BattleCriteria, BattleScores, BattleResult } from '@/lib/types/arena';
import { battleResultSchema } from '@/lib/types/arena';

export type BattleAnalysisParams = {
  challenger: {
    username: string;
    profile: DeveloperProfile;
    repos: RepoSummary[];
  };
  opponent: {
    username: string;
    profile: DeveloperProfile;
    repos: RepoSummary[];
  };
  criteria?: BattleCriteria[];
};

export type BattleAnalysisResult = {
  result: BattleResult;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

/**
 * Analyze a battle between two developers and determine the winner
 */
export async function analyzeBattle(
  challenger: BattleAnalysisParams['challenger'],
  opponent: BattleAnalysisParams['opponent'],
  criteria: BattleCriteria[] = ['code_quality', 'project_complexity', 'skill_diversity', 'innovation']
): Promise<BattleAnalysisResult> {
  
  const defaultCriteria = [
    'code_quality',
    'project_complexity', 
    'skill_diversity',
    'innovation',
    'documentation',
    'testing',
    'architecture'
  ];

  const battleCriteria = criteria.length > 0 ? criteria : defaultCriteria;

  // Prepare repository information for analysis
  const challengerTopRepos = challenger.repos
    .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0))
    .slice(0, 10)
    .map(r => `${r.owner}/${r.name} (${r.language || 'Unknown'}, ${r.stargazersCount || 0}⭐)`);
    
  const opponentTopRepos = opponent.repos
    .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0))
    .slice(0, 10)
    .map(r => `${r.owner}/${r.name} (${r.language || 'Unknown'}, ${r.stargazersCount || 0}⭐)`);

  const prompt = `
    You are an expert Senior Engineering Manager judging a "Dev Arena" battle between two developers.
    
    CHALLENGER: ${challenger.username}
    OPPONENT: ${opponent.username}
    
    BATTLE CRITERIA: ${battleCriteria.join(', ')}
    
    Your task is to analyze both developers and determine a winner based on the specified criteria.
    Be fair, evidence-based, and provide detailed reasoning.
    
    CHALLENGER DATA:
    ${JSON.stringify(challenger.profile, null, 2)}
    
    OPPONENT DATA:
    ${JSON.stringify(opponent.profile, null, 2)}
    
    REPOSITORY COMPARISON:
    Challenger Top Repos (${challenger.repos.length} total): ${challengerTopRepos.join(', ')}
    Opponent Top Repos (${opponent.repos.length} total): ${opponentTopRepos.join(', ')}
    
    ANALYSIS REQUIREMENTS:
    1. Score each developer on each criterion (1-10)
    2. Provide detailed reasoning for each score
    3. Determine the overall winner
    4. Highlight key strengths and weaknesses
    5. Provide constructive feedback for improvement
    
    Your output must be a valid JSON object that strictly adheres to the provided schema.
  `;

  const { object, usage } = await generateObject({
    model: google('models/gemini-2.5-flash'),
    schema: battleResultSchema,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  // Add repository information to the result
  const resultWithRepos = {
    ...object,
    repositories: {
      challenger: {
        total: challenger.repos.length,
        topRepos: challengerTopRepos.slice(0, 5), // Top 5 repos
      },
      opponent: {
        total: opponent.repos.length,
        topRepos: opponentTopRepos.slice(0, 5), // Top 5 repos
      },
    },
  };

  return {
    result: resultWithRepos,
    usage: {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    },
  };
}

/**
 * Calculate ELO rating changes for a battle
 */
export function calculateEloChange(
  challengerRating: number,
  opponentRating: number,
  challengerWon: boolean,
  kFactor: number = 32
): { challengerChange: number; opponentChange: number } {
  
  // Expected scores
  const challengerExpected = 1 / (1 + Math.pow(10, (opponentRating - challengerRating) / 400));
  const opponentExpected = 1 - challengerExpected;
  
  // Actual scores (1 for win, 0 for loss, 0.5 for draw)
  const challengerActual = challengerWon ? 1 : 0;
  const opponentActual = challengerWon ? 0 : 1;
  
  // Calculate rating changes
  const challengerChange = Math.round(kFactor * (challengerActual - challengerExpected));
  const opponentChange = Math.round(kFactor * (opponentActual - opponentExpected));
  
  return {
    challengerChange,
    opponentChange,
  };
}

/**
 * Determine tier based on ELO rating
 */
export function getTierFromElo(rating: number): string {
  if (rating >= 2000) return 'Master';
  if (rating >= 1800) return 'Diamond';
  if (rating >= 1600) return 'Platinum';
  if (rating >= 1400) return 'Gold';
  if (rating >= 1200) return 'Silver';
  return 'Bronze';
}

/**
 * Calculate K-factor based on developer activity and rating
 */
export function calculateKFactor(
  totalBattles: number,
  rating: number,
  isTournament: boolean = false
): number {
  if (isTournament) return 40; // Higher K-factor for tournaments
  
  if (totalBattles < 30) return 40; // New players get higher K-factor
  if (rating >= 2000) return 16; // Master players get lower K-factor
  if (rating >= 1600) return 24; // High-rated players
  
  return 32; // Default K-factor
}

/**
 * Generate battle highlights and recommendations
 */
export function generateBattleInsights(
  challengerProfile: DeveloperProfile,
  opponentProfile: DeveloperProfile,
  winner: string
): { highlights: string[]; recommendations: string[] } {
  const highlights: string[] = [];
  const recommendations: string[] = [];
  
  // Compare skill assessments
  const challengerAvgSkill = challengerProfile.skillAssessment.reduce((sum, skill) => sum + skill.score, 0) / challengerProfile.skillAssessment.length;
  const opponentAvgSkill = opponentProfile.skillAssessment.reduce((sum, skill) => sum + skill.score, 0) / opponentProfile.skillAssessment.length;
  
  if (challengerAvgSkill > opponentAvgSkill) {
    highlights.push(`${challengerProfile.summary.split(' ')[0]} demonstrates stronger overall technical skills`);
  } else {
    highlights.push(`${opponentProfile.summary.split(' ')[0]} shows superior technical foundation`);
  }
  
  // Compare development styles
  const challengerAvgStyle = challengerProfile.developmentStyle.reduce((sum, style) => sum + style.score, 0) / challengerProfile.developmentStyle.length;
  const opponentAvgStyle = opponentProfile.developmentStyle.reduce((sum, style) => sum + style.score, 0) / opponentProfile.developmentStyle.length;
  
  if (challengerAvgStyle > opponentAvgStyle) {
    highlights.push(`${challengerProfile.summary.split(' ')[0]} has more refined development practices`);
  } else {
    highlights.push(`${opponentProfile.summary.split(' ')[0]} excels in development methodology`);
  }
  
  // Generate recommendations
  const loser = winner === challengerProfile.summary.split(' ')[0] ? opponentProfile : challengerProfile;
  
  if (loser.skillAssessment.some(skill => skill.score < 6)) {
    recommendations.push(`Focus on improving weaker technical skills`);
  }
  
  if (loser.developmentStyle.some(style => style.score < 6)) {
    recommendations.push(`Enhance development practices and code quality`);
  }
  
  if (loser.topRepos.length < 3) {
    recommendations.push(`Build more substantial projects to showcase skills`);
  }
  
  return { highlights, recommendations };
} 