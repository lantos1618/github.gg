import { z } from 'zod';

// Scored metric for skills and development style
export const scoredMetricSchema = z.object({
  metric: z.string().describe("A specific technical skill, language, or framework."),
  score: z.number().min(1).max(10).describe("Proficiency score from 1 (Beginner) to 10 (Expert)."),
  reason: z.string().describe("A concise, evidence-based reason for the assigned score.")
});

export type ScoredMetric = z.infer<typeof scoredMetricSchema>;

// Scored repository with significance
export const scoredRepoSchema = z.object({
  name: z.string(),
  owner: z.string(),
  repo: z.string(),
  description: z.string(),
  url: z.string(),
  significanceScore: z.number().min(1).max(10).describe("A score from 1-10 representing the repository's importance to this developer's profile. Use whole numbers only (1, 2, 3, etc.), not decimals."),
  reason: z.string().describe("Why this repository is considered a top project for them.")
});

export type ScoredRepo = z.infer<typeof scoredRepoSchema>;

// Tech stack item
export const techStackItemSchema = z.object({
  name: z.string(),
  type: z.enum(['Language', 'Framework', 'Database', 'Tool', 'Platform', 'Library']),
  repoCount: z.number().describe("Number of repositories this technology was identified in.")
});

export type TechStackItem = z.infer<typeof techStackItemSchema>;

// Complete developer profile schema
export const developerProfileSchema = z.object({
  summary: z.string().describe("A 2-3 sentence professional summary of the developer's profile and expertise."),
  skillAssessment: z.array(scoredMetricSchema).describe("An assessment of the developer's top 5-7 skills."),
  techStack: z.array(techStackItemSchema),
  developmentStyle: z.array(scoredMetricSchema).describe("An analysis of the developer's coding habits and contribution patterns."),
  topRepos: z.array(scoredRepoSchema).describe("The developer's 5 most notable or representative repositories."),
  suggestions: z.array(z.string()).describe("Concrete suggestions for improvement or next steps for the developer."),
});

export type DeveloperProfile = z.infer<typeof developerProfileSchema>; 