import type { RepoSummary } from '@/lib/github';
import { type DeveloperProfile, type ScoredRepo } from '@/lib/types/profile';
import { db } from '@/db';
import { Resend } from 'resend';
import { developerEmails, repositoryScorecards } from '@/db/schema';
import type { Octokit } from '@octokit/rest';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { developerProfileSchema } from '@/lib/types/profile';
import { generateScorecardAnalysis, type ScorecardAnalysisResult } from './scorecard';
import { and, eq, sql, inArray } from 'drizzle-orm';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Utility function to check if an error is a PostgreSQL error with a code
function isPgErrorWithCode(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code?: unknown }).code === 'string';
}

/**
 * Extract email from a git patch format
 * Parses lines like "From: Name <email@example.com>" or "Author: Name <email@example.com>"
 */
function extractEmailFromPatch(patchText: string): string | null {
  const lines = patchText.split('\n');
  for (const line of lines) {
    // Look for From: or Author: lines
    if (line.startsWith('From:') || line.startsWith('Author:')) {
      // Extract email from format: "Name <email@example.com>"
      const emailMatch = line.match(/<([^>]+)>/);
      if (emailMatch && emailMatch[1]) {
        const email = emailMatch[1];
        // Filter out noreply emails
        if (!email.includes('noreply.github.com') && !email.endsWith('@github.com')) {
          return email;
        }
      }
    }
  }
  return null;
}

/**
 * Find the real email of a GitHub user by scanning their commits in public repos.
 * Returns the most frequent non-noreply email, or null if none found.
 *
 * IMPORTANT: This function is rate-limited to prevent self-DDoS:
 * - Max 3 repos scanned
 * - Max 10 commits per repo
 * - Max 3 patch fetches total (expensive fallback)
 */
const MAX_REPOS_TO_SCAN = 3;
const MAX_COMMITS_PER_REPO = 10;
const MAX_PATCH_FETCHES = 3;

export async function findAndStoreDeveloperEmail(octokit: Octokit, username: string, repos: { name: string }[]): Promise<string | null> {
  const emailCounts: Record<string, number> = {};
  let bestEmail: string | null = null;
  let bestRepo: string | null = null;
  let patchFetchCount = 0;

  // Only scan top 3 repos (sorted by stars if available, otherwise take first 3)
  const reposToScan = repos.slice(0, MAX_REPOS_TO_SCAN);
  console.log(`📧 Scanning ${reposToScan.length} repos for email (max ${MAX_REPOS_TO_SCAN})`);

  for (const repo of reposToScan) {
    // Early exit if we already found a good email
    if (bestEmail && emailCounts[bestEmail] >= 3) {
      console.log(`📧 Found confident email (${emailCounts[bestEmail]} occurrences), stopping scan`);
      break;
    }

    try {
      const { data: commits } = await octokit.repos.listCommits({
        owner: username,
        repo: repo.name,
        per_page: MAX_COMMITS_PER_REPO
      });

      for (const commit of commits) {
        const login = commit.author?.login;
        let email = commit.commit?.author?.email;

        // If no email in API response or it's a noreply email, try fetching the patch as fallback
        // But limit patch fetches to avoid too many requests
        if (
          login === username &&
          (!email || email.includes('noreply.github.com') || email.endsWith('@github.com')) &&
          patchFetchCount < MAX_PATCH_FETCHES
        ) {
          try {
            patchFetchCount++;
            // Fetch commit patch to extract real email
            const patchResponse = await fetch(`https://github.com/${username}/${repo.name}/commit/${commit.sha}.patch`);
            if (patchResponse.ok) {
              const patchText = await patchResponse.text();
              const patchEmail = extractEmailFromPatch(patchText);
              if (patchEmail) {
                email = patchEmail;
                console.log(`✉️  Found email from patch for ${username}: ${email}`);
              }
            }
          } catch (patchError) {
            // Silently continue if patch fetch fails
            console.warn(`Failed to fetch patch for commit ${commit.sha}:`, patchError);
          }
        }

        // Count valid emails
        if (
          login === username &&
          email &&
          !email.includes('noreply.github.com') &&
          !email.endsWith('@github.com')
        ) {
          emailCounts[email] = (emailCounts[email] || 0) + 1;
          if (!bestEmail || emailCounts[email] > (emailCounts[bestEmail] || 0)) {
            bestEmail = email;
            bestRepo = repo.name;
          }
        }
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 409) {
        console.log(`Skipping empty repository: ${repo.name}`);
        continue;
      }
      console.warn(`Error fetching commits for ${repo.name}:`, err.message);
      continue;
    }
  }

  if (bestEmail) {
    await db.insert(developerEmails).values({
      username,
      email: bestEmail,
      sourceRepo: bestRepo,
    }).onConflictDoUpdate({
      target: [developerEmails.email],
      set: { lastUsedAt: new Date(), sourceRepo: bestRepo },
    });
  }
  return bestEmail;
}

/**
 * Send a developer profile report to the given email using Resend.
 */
export async function sendDeveloperProfileEmail(email: string, profileHtml: string) {
  if (!resend) {
    console.log('Resend not configured - skipping email send');
    return;
  }

  await resend.emails.send({
    from: 'noreply@github.gg',
    to: email,
    subject: 'Your GitHub.gg Developer Profile',
    html: profileHtml,
  });
}

export type DeveloperProfileParams = {
  username: string;
  repos: RepoSummary[];
  repoFiles?: Array<{
    repoName: string;
    files: Array<{ path: string; content: string }>;
  }>;
  userId: string; // userId is now required to associate scorecards
  onProgress?: (current: number, total: number, repoName: string) => void;
};

export type DeveloperProfileResult = {
  profile: DeveloperProfile;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export async function* generateDeveloperProfileStreaming({
  username,
  repos,
  repoFiles,
  userId,
}: Omit<DeveloperProfileParams, 'onProgress'>): AsyncGenerator<{
  type: 'progress' | 'complete';
  progress?: number;
  message?: string;
  metadata?: { current: number; total: number; repoName: string };
  result?: DeveloperProfileResult;
}> {
  // Filter out forked repositories - we only want to score based on user's original work
  const nonForkedRepos = repos.filter(repo => !repo.fork);

  console.log(`📊 Total repos: ${repos.length}, Non-forked: ${nonForkedRepos.length}, Filtered out: ${repos.length - nonForkedRepos.length} forks`);

  const repoDataForPrompt = nonForkedRepos.slice(0, 20).map(repo => ({
    name: repo.name,
    owner: repo.owner,
    language: repo.language,
    description: repo.description,
    stars: repo.stargazersCount,
    topics: repo.topics,
  }));

  const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let scorecardInsights = '';

  if (repoFiles && repoFiles.length > 0) {
    const topReposToAnalyze = repoFiles.slice(0, 5);
    const repoNames = topReposToAnalyze.map(r => r.repoName);

    // Batch query: fetch existing scorecards for specific repos only
    const existingScorecards = await db
      .select()
      .from(repositoryScorecards)
      .where(and(
        eq(repositoryScorecards.userId, userId),
        eq(repositoryScorecards.repoOwner, username),
        inArray(repositoryScorecards.repoName, repoNames)
      ));

    const existingScorecardMap = new Map(
      existingScorecards.map(sc => [`${sc.repoOwner}/${sc.repoName}`, sc])
    );

    console.log(`🔍 Found ${existingScorecards.length} existing scorecards`);

    // Process scorecards in parallel for better performance
    const total = topReposToAnalyze.length;
    let completed = 0;

    // Create promises for all repos
    const scorecardPromises = topReposToAnalyze.map(async (repoData) => {
      const repoKey = `${username}/${repoData.repoName}`;
      let result;

      // Check if we already have a recent scorecard for this repo
      if (existingScorecardMap.has(repoKey)) {
        // ... existing cache logic ...
        console.log(`✅ Using cached scorecard for ${repoData.repoName}`);
        const existing = existingScorecards.find(sc =>
          sc.repoOwner === username && sc.repoName === repoData.repoName
        );
        if (existing) {
          result = {
            repoName: repoData.repoName,
            scorecard: {
              overallScore: existing.overallScore,
              metrics: existing.metrics,
              markdown: existing.markdown,
            },
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, // No new tokens used
          };
        }
      }

      if (!result) {
        try {
          console.log(`🔍 Analyzing ${repoData.repoName}...`);
          
          // Add timeout wrapper (60 seconds max per repo)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout: Scorecard generation for ${repoData.repoName} exceeded 60s`)), 60000)
          );
          
          const scorecardResult = await Promise.race([
            generateScorecardAnalysis({
              files: repoData.files,
              repoName: repoData.repoName,
            }),
            timeoutPromise
          ]) as ScorecardAnalysisResult;

          console.log(`✅ Scorecard generated for ${repoData.repoName}`);

          // Save the generated scorecard to the database
          // Retry logic handles race conditions by recalculating version on each attempt
          let inserted = null;
          for (let retryCount = 0; retryCount < 3; retryCount++) {
            // Recalculate version on each retry to handle concurrent inserts
            const maxVersionResult = await db
              .select({ max: sql<number>`COALESCE(MAX(version), 0)` })
              .from(repositoryScorecards)
              .where(and(
                eq(repositoryScorecards.userId, userId),
                eq(repositoryScorecards.repoOwner, username),
                eq(repositoryScorecards.repoName, repoData.repoName)
              ));
            const nextVersion = (maxVersionResult[0]?.max || 0) + 1;

            try {
              const [insertResult] = await db.insert(repositoryScorecards).values({
                userId,
                repoOwner: username,
                repoName: repoData.repoName,
                ref: 'main',
                version: nextVersion,
                ...scorecardResult.scorecard,
              }).onConflictDoNothing().returning();
              
              if (insertResult) {
                inserted = insertResult;
                break;
              }
              // If insertResult is null, onConflictDoNothing prevented insert - retry with new version
            } catch (e) {
              if (isPgErrorWithCode(e) && e.code === '23505') {
                // Unique constraint violation - retry with recalculated version
                continue;
              }
              throw e;
            }
          }
          if (!inserted) console.warn(`Failed to insert scorecard for ${repoData.repoName} after 3 retries`);

          result = {
            repoName: repoData.repoName,
            scorecard: scorecardResult.scorecard,
            usage: scorecardResult.usage,
          };
        } catch (error) {
          console.warn(`Failed to generate or save scorecard for ${repoData.repoName}:`, error);
          result = null;
        }
      }

      return { repoName: repoData.repoName, result };
    });

    // Use Promise.allSettled with progress updates via a heartbeat
    const resultsMap = new Map<string, { repoName: string; scorecard: ScorecardAnalysisResult['scorecard']; usage: ScorecardAnalysisResult['usage'] }>();
    let completedCount = 0;
    
    // Start heartbeat to send progress updates
    const heartbeatInterval = setInterval(() => {
      if (completedCount < total) {
        // Progress updates are handled by the generator yield below
      }
    }, 3000);

    try {
      // Wait for all promises to settle (with individual timeouts already in place)
      const settledResults = await Promise.allSettled(scorecardPromises);
      
      settledResults.forEach((settled, index) => {
        const repoName = topReposToAnalyze[index].repoName;
        completedCount++;
        
        if (settled.status === 'fulfilled' && settled.value.result) {
          resultsMap.set(repoName, settled.value.result);
        } else {
          const error = settled.status === 'rejected' ? settled.reason : 'Unknown error';
          console.warn(`❌ Scorecard generation failed for ${repoName}:`, error);
        }
      });
    } finally {
      clearInterval(heartbeatInterval);
    }
    
    // Yield progress for each completed repo
    for (const [repoName, result] of resultsMap.entries()) {
      yield {
        type: 'progress',
        progress: 10 + Math.round((resultsMap.size / total) * 70),
        message: `Completed analysis for ${repoName}`,
        metadata: { current: resultsMap.size, total, repoName }
      };
    }
    
    const scorecardResults = Array.from(resultsMap.values());

    // Aggregate results
    scorecardResults.forEach(result => {
      if (result) {
        scorecardInsights += `\n\n## Repository: ${result.repoName}\n${result.scorecard.markdown}`;
        totalUsage.inputTokens += result.usage.inputTokens;
        totalUsage.outputTokens += result.usage.outputTokens;
        totalUsage.totalTokens += result.usage.totalTokens;
      }
    });
  }

  yield { type: 'progress', progress: 85, message: 'Generating final profile analysis...' };
  console.log(`🤖 Generating developer profile with AI...`);

  // Validate that we have actual non-forked repos
  if (nonForkedRepos.length === 0) {
    throw new Error(`No original (non-forked) public repositories found for user '${username}'. Cannot generate profile.`);
  }

  const prompt = `
    You are an expert Senior Engineering Manager creating a "Developer Profile" for GitHub user '${username}'.
    Analyze their public repositories metadata and the detailed code analysis from their scorecards to produce a fair, evidence-based assessment.
    For each scored metric, provide a score from 1 (novice) to 10 (expert) and a concise reason.
    Base your reasons on the provided data.
    Also provide 3-5 concrete, actionable suggestions for how this developer can improve.

    IMPORTANT: We are analyzing ONLY their original repositories (forked repos have been excluded) to ensure fair scoring based on their actual contributions.

    CRITICAL RULES:
    1. You MUST ONLY use repositories from the provided "Repository Metadata" section below
    2. DO NOT invent, hallucinate, or create fake repository names
    3. For each repository in topRepos, the "name" field MUST exactly match a repository name from the metadata
    4. Include up to 5 repositories in the topRepos array (or fewer if less than 5 exist)
    5. For significanceScore, use ONLY whole numbers from 1-10 (no decimals)

    DEVELOPER ARCHETYPE CLASSIFICATION:
    Classify this developer into ONE of these archetypes based on their repository patterns:
    - "Research & Innovation": Explores cutting-edge problems (AI, ML, novel algorithms), many experimental or incomplete repos, prioritizes learning and exploration over polish. Look for: academic/research topics, benchmark repos, proof-of-concepts, cutting-edge tech experiments.
    - "Production Builder": Ships complete, polished projects with good documentation and testing. Look for: comprehensive READMEs, CI/CD configs, test directories, versioned releases.
    - "Open Source Contributor": Profile suggests major work is in contributions to other projects (few original repos, or repos that are utilities/tools for contributing elsewhere).
    - "Full-Stack Generalist": Covers many different areas and technologies, jack of multiple trades. Look for: diverse language usage, both frontend and backend projects, varied domains.
    - "Domain Specialist": Deep expertise in a specific area (e.g., systems programming, web development, data engineering, mobile). Look for: concentrated focus in one domain across multiple repos.
    - "Early Career Explorer": Newer to development, building their portfolio. Look for: tutorial-style projects, learning exercises, bootcamp projects, limited commit history.

    PROFILE CONFIDENCE ASSESSMENT:
    Assess how well this GitHub profile represents the developer's TRUE capabilities on a scale of 1-100:
    - 80-100: Complete picture - multiple substantial repos with meaningful code, active history, clear skill patterns demonstrated.
    - 50-79: Partial picture - some good repos but gaps, inconsistencies, or signs that significant work may exist elsewhere.
    - 1-49: Incomplete picture - signs this developer likely has significant work not visible here.

    Factors that LOWER confidence:
    * Research-focused developer (high innovation/complexity but low completeness/docs) - they're likely skilled but GitHub doesn't show it
    * Very few repos relative to apparent skill level
    * Many placeholder/empty repos alongside sophisticated ones
    * Enterprise developer pattern (polished small utilities, no major projects visible)
    * Recent GitHub account with advanced code quality

    Factors that RAISE confidence:
    * Multiple complete projects with docs, tests, and active maintenance
    * Consistent commit history over time
    * Clear progression of skills visible in repo history
    * Projects that match the developer's apparent skill level

    Provide a brief confidenceReason explaining your assessment.

    SCORE INTERPRETATION:
    Write 1-2 sentences in scoreInterpretation that help users correctly interpret the overall score for THIS specific developer. Consider:
    - If archetype is "Research & Innovation" and score is moderate: Acknowledge that research developers often prioritize exploration over polish, and highlight their technical strengths.
    - If confidence is "Low": Note that the score reflects GitHub profile completeness, not necessarily full capabilities.
    - If archetype is "Production Builder" and score is high: The score accurately reflects production-ready development skills.
    - Be specific about what the score DOES and DOES NOT capture for this particular developer.

    Example interpretations:
    - For a researcher with 55 score: "Score reflects GitHub profile completeness rather than research capability. Strong technical innovation (9/10) and domain expertise are evident despite incomplete project packaging."
    - For a builder with 85 score: "Score accurately reflects production-ready development skills with consistent delivery of well-documented, tested projects."
    - For early career with 45 score: "Score reflects current portfolio maturity. Fundamentals are solid; continued project completion will improve this assessment."

    Your entire output must be a single, valid JSON object that strictly adheres to the provided Zod schema.

    Repository Metadata (${nonForkedRepos.length} original repositories available):
    ${JSON.stringify(repoDataForPrompt, null, 2)}
    ${scorecardInsights ? `\nDetailed Code Analysis from Scorecards:\n${scorecardInsights}` : ''}
  `;

  const { object, usage } = await generateObject({
    model: google('models/gemini-3-pro-preview'),
    schema: developerProfileSchema,
    messages: [{ role: 'user', content: prompt }],
  });
  
  console.log(`✅ AI profile generation completed`);

  totalUsage.inputTokens += usage.inputTokens || 0;
  totalUsage.outputTokens += usage.outputTokens || 0;
  totalUsage.totalTokens += (usage.inputTokens || 0) + (usage.outputTokens || 0);

  const patchedProfile = {
    ...object,
    topRepos: Array.isArray(object.topRepos)
      ? object.topRepos.map((r: ScoredRepo) => {
          const match = nonForkedRepos.find(repo => repo.name === r.name || repo.url === r.url);
          return {
            ...r,
            owner: match?.owner || username,
            repo: match?.name || r.name,
          };
        })
      : [],
  };

  yield {
    type: 'complete',
    result: {
    profile: patchedProfile,
    usage: totalUsage,
    }
  };
} 
