import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { DeveloperProfile } from '@/lib/types/profile';

// Schema for candidate fit analysis
const candidateFitSchema = z.object({
  fitScore: z.number().min(0).max(100).describe('Overall fit score from 0-100'),
  fitReason: z.string().describe('2-3 sentence explanation of the fit assessment'),
  keyStrengths: z.array(z.string()).describe('3-5 strengths that match the job requirements'),
  potentialGaps: z.array(z.string()).describe('Areas where the candidate may need growth'),
  interviewFocus: z.array(z.string()).describe('2-3 areas to probe in an interview'),
  estimatedSalaryRange: z.object({
    min: z.number().describe('Minimum estimated salary in USD'),
    max: z.number().describe('Maximum estimated salary in USD'),
    currency: z.string().default('USD'),
  }).describe('Estimated salary range based on skills and experience'),
});

export type CandidateFit = z.infer<typeof candidateFitSchema>;

export interface CandidateMatch {
  username: string;
  profile: DeveloperProfile;
  similarityScore: number; // From vector search
  fit: CandidateFit;
}

// Salary ranges by archetype (base ranges in USD)
const SALARY_RANGES: Record<string, { min: number; max: number }> = {
  'Early Career Explorer': { min: 60000, max: 95000 },
  'Full-Stack Generalist': { min: 90000, max: 150000 },
  'Production Builder': { min: 120000, max: 185000 },
  'Domain Specialist': { min: 130000, max: 200000 },
  'Research & Innovation': { min: 140000, max: 220000 },
  'Open Source Contributor': { min: 100000, max: 170000 },
};

/**
 * Analyze how well a candidate fits a job description
 */
export async function analyzeCandidate(
  jobDescription: string,
  profile: DeveloperProfile,
  username: string
): Promise<CandidateFit> {
  const prompt = `You are an expert technical recruiter. Analyze how well this candidate fits the job requirements.

## Job Description
${jobDescription}

## Candidate Profile: ${username}

**Summary:** ${profile.summary || 'Not available'}

**Developer Type:** ${profile.developerArchetype || 'Unknown'}

**Skills:**
${profile.skillAssessment?.map(s => `- ${s.metric}: ${s.score}/10 (${s.reason})`).join('\n') || 'Not available'}

**Tech Stack:**
${profile.techStack?.map(t => `- ${t.name} (${t.type})`).join('\n') || 'Not available'}

**Notable Projects:**
${profile.topRepos?.slice(0, 3).map(r => `- ${r.name}: ${r.reason} (significance: ${r.significanceScore}/10)`).join('\n') || 'Not available'}

**Profile Confidence:** ${profile.profileConfidence || 0}%

## Instructions
1. Score the fit from 0-100 based on skill match, experience level, and job requirements
2. Identify 3-5 key strengths that align with the job
3. Note any potential gaps or areas for growth
4. Suggest 2-3 interview focus areas
5. Estimate a realistic salary range based on their archetype and skills

Be objective and evidence-based. A 100 score means perfect match, 80+ is strong, 60-79 is moderate, below 60 is weak fit.`;

  const result = await generateObject({
    model: google('models/gemini-2.0-flash'),
    schema: candidateFitSchema,
    prompt,
  });

  // Adjust salary based on archetype if not provided by AI
  const baseRange = SALARY_RANGES[profile.developerArchetype || 'Full-Stack Generalist'] || SALARY_RANGES['Full-Stack Generalist'];

  // Apply confidence modifier (higher confidence = higher potential salary)
  const confidenceModifier = (profile.profileConfidence || 50) / 100;
  const adjustedMin = Math.round(baseRange.min * (0.9 + confidenceModifier * 0.2));
  const adjustedMax = Math.round(baseRange.max * (0.9 + confidenceModifier * 0.2));

  return {
    ...result.object,
    estimatedSalaryRange: {
      min: result.object.estimatedSalaryRange?.min || adjustedMin,
      max: result.object.estimatedSalaryRange?.max || adjustedMax,
      currency: 'USD',
    },
  };
}

/**
 * Batch analyze multiple candidates
 * Returns candidates sorted by fit score (descending)
 */
export async function rankCandidates(
  jobDescription: string,
  candidates: Array<{ username: string; profile: DeveloperProfile; similarityScore: number }>
): Promise<CandidateMatch[]> {
  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  const results: CandidateMatch[] = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (candidate) => {
        try {
          const fit = await analyzeCandidate(jobDescription, candidate.profile, candidate.username);
          return {
            username: candidate.username,
            profile: candidate.profile,
            similarityScore: candidate.similarityScore,
            fit,
          };
        } catch (error) {
          console.error(`Failed to analyze candidate ${candidate.username}:`, error);
          // Return a default low-score fit on error
          return {
            username: candidate.username,
            profile: candidate.profile,
            similarityScore: candidate.similarityScore,
            fit: {
              fitScore: 0,
              fitReason: 'Analysis failed',
              keyStrengths: [],
              potentialGaps: ['Unable to analyze profile'],
              interviewFocus: [],
              estimatedSalaryRange: { min: 0, max: 0, currency: 'USD' },
            },
          };
        }
      })
    );
    results.push(...batchResults);
  }

  // Sort by fit score descending
  return results.sort((a, b) => b.fit.fitScore - a.fit.fitScore);
}
