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

// Developer archetype enum - classifies the developer's primary working style
export const developerArchetypeEnum = z.enum([
  'Research & Innovation',    // Explores cutting-edge problems, many experimental/incomplete repos, prioritizes learning over polish
  'Production Builder',       // Ships complete, polished projects with good docs and testing
  'Open Source Contributor',  // Major work appears to be contributions to other projects
  'Full-Stack Generalist',    // Covers many areas, jack of multiple trades
  'Domain Specialist',        // Deep expertise in specific area (AI, systems, web, etc.)
  'Early Career Explorer'     // Newer to development, building portfolio
]);

export type DeveloperArchetype = z.infer<typeof developerArchetypeEnum>;


// Complete developer profile schema
export const developerProfileSchema = z.object({
  summary: z.string().describe("A 2-3 sentence professional summary of the developer's profile and expertise."),
  skillAssessment: z.array(scoredMetricSchema).describe("An assessment of the developer's top 5-7 skills."),
  techStack: z.array(techStackItemSchema),
  developmentStyle: z.array(scoredMetricSchema).describe("An analysis of the developer's coding habits and contribution patterns."),
  topRepos: z.array(scoredRepoSchema).describe("The developer's 5 most notable or representative repositories."),
  suggestions: z.array(z.string()).describe("Concrete suggestions for improvement or next steps for the developer."),

  // New fields for contextualizing the score
  developerArchetype: developerArchetypeEnum.describe("The developer's primary working style based on their repository patterns."),
  profileConfidence: z.number().min(1).max(100).describe("How confidently this GitHub profile represents the developer's true capabilities (1-100). Higher = more complete picture. Lower = likely has significant work not visible on GitHub."),
  confidenceReason: z.string().describe("Brief explanation of why the profile confidence is at this level."),
  scoreInterpretation: z.string().describe("1-2 sentences helping users interpret the overall score in context of this developer's archetype and work style."),
});

export type DeveloperProfile = z.infer<typeof developerProfileSchema>; 