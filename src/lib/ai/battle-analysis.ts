import type { BattleCriteria } from '@/lib/types/arena';
import { ELO_TIERS, K_FACTORS } from '@/lib/constants/arena';

export type BattleAnalysisParams = {
  challenger: {
    username: string;
    profile: {
      summary: string;
      skillAssessment: { name: string; score: number }[];
      developmentStyle: { name: string; score: number }[];
      topRepos: { name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }[];
    };
    repos: { name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }[];
  };
  opponent: {
    username: string;
    profile: {
      summary: string;
      skillAssessment: { name: string; score: number }[];
      developmentStyle: { name: string; score: number }[];
      topRepos: { name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }[];
    };
    repos: { name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }[];
  };
  criteria?: BattleCriteria[];
};

export type BattleAnalysisResult = {
  result: {
    winner: string;
    reason: string;
    challengerScore: {
      total: number;
      breakdown: {
        code_quality: number;
        project_complexity: number;
        skill_diversity: number;
        innovation: number;
        documentation: number;
        testing: number;
        architecture: number;
        performance: number;
        security: number;
        maintainability: number;
      };
    };
    opponentScore: {
      total: number;
      breakdown: {
        code_quality: number;
        project_complexity: number;
        skill_diversity: number;
        innovation: number;
        documentation: number;
        testing: number;
        architecture: number;
        performance: number;
        security: number;
        maintainability: number;
      };
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

/**
 * Analyze battle between two developers using AI
 */
export async function analyzeBattle(
  challengerRepos: string,
  opponentRepos: string,
  challengerUsername: string
): Promise<BattleAnalysisResult> {
  // This is a placeholder implementation
  // In a real implementation, you would call an AI service here
  
  const mockAnalysis = {
    winner: challengerUsername,
    reason: "Based on the analysis of repositories, the challenger demonstrated superior code quality and project complexity.",
    challengerScore: {
      total: 75,
      breakdown: {
        code_quality: 80,
        project_complexity: 70,
        skill_diversity: 75,
        innovation: 80,
        documentation: 70,
        testing: 75,
        architecture: 80,
        performance: 70,
        security: 75,
        maintainability: 75
      }
    },
    opponentScore: {
      total: 65,
      breakdown: {
        code_quality: 70,
        project_complexity: 60,
        skill_diversity: 65,
        innovation: 70,
        documentation: 60,
        testing: 65,
        architecture: 70,
        performance: 60,
        security: 65,
        maintainability: 65
      }
    },
    highlights: [
      "Challenger showed excellent code organization",
      "Strong documentation practices observed",
      "Innovative problem-solving approaches"
    ],
    recommendations: [
      "Consider adding more comprehensive tests",
      "Focus on performance optimization",
      "Enhance documentation practices"
    ]
  };

  return {
    result: mockAnalysis,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
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
  challengerProfile: { summary: string; skillAssessment: { name: string; score: number }[]; developmentStyle: { name: string; score: number }[]; topRepos: { name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }[] },
  opponentProfile: { summary: string; skillAssessment: { name: string; score: number }[]; developmentStyle: { name: string; score: number }[]; topRepos: { name: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; updated_at: string }[] },
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