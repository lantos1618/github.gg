import { z } from 'zod';

// Scorecard metric structure
export interface ScorecardMetric {
  metric: string;
  score: number;
  reason: string;
}

// Scorecard data structure
export interface ScorecardData {
  metrics: ScorecardMetric[];
  markdown: string;
  overallScore: number;
}

// Scorecard response from tRPC
export interface ScorecardResponse {
  scorecard: ScorecardData;
  cached: boolean;
  stale: boolean;
  lastUpdated: string;
}

// Zod schema for validation
export const scorecardSchema = z.object({
  metrics: z.array(z.object({
    metric: z.string(),
    score: z.number(),
    reason: z.string(),
  })),
  markdown: z.string(),
  overallScore: z.number(),
});

// Diagram options type
export interface DiagramOptions {
  maxDepth?: number;
  includeFiles?: boolean;
  showDependencies?: boolean;
  layout?: 'horizontal' | 'vertical';
  theme?: 'default' | 'dark' | 'light';
} 