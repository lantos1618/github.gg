import type { RepoSummary } from '@/lib/github';
import { type DeveloperProfile, type ScoredRepo } from '@/lib/types/profile';
import { db } from '@/db';
import { Resend } from 'resend';
import { developerEmails, repositoryScorecards } from '@/db/schema';
import type { Octokit } from '@octokit/rest';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { developerProfileSchema } from '@/lib/types/profile';
import { generateScorecardAnalysis } from './scorecard';
import { and, eq, sql } from 'drizzle-orm';

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
 * Fallback: If API doesn't return emails, fetch commit patches to extract them.
 */
export async function findAndStoreDeveloperEmail(octokit: Octokit, username: string, repos: { name: string }[]): Promise<string | null> {
  const emailCounts: Record<string, number> = {};
  let bestEmail: string | null = null;
  let bestRepo: string | null = null;

  for (const repo of repos) {
    try {
      const { data: commits } = await octokit.repos.listCommits({ owner: username, repo: repo.name, per_page: 30 });

      for (const commit of commits) {
        const login = commit.author?.login;
        let email = commit.commit?.author?.email;

        // If no email in API response or it's a noreply email, try fetching the patch as fallback
        if (login === username && (!email || email.includes('noreply.github.com') || email.endsWith('@github.com'))) {
          try {
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

export async function generateDeveloperProfile({
  username,
  repos,
  repoFiles,
  userId,
  onProgress
}: DeveloperProfileParams): Promise<DeveloperProfileResult> {
  const repoDataForPrompt = repos.slice(0, 20).map(repo => ({
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

    // Check for existing scorecards first
    const existingScorecards = await db
      .select()
      .from(repositoryScorecards)
      .where(and(
        eq(repositoryScorecards.userId, userId),
        eq(repositoryScorecards.repoOwner, username)
      ));

    const existingScorecardMap = new Map(
      existingScorecards.map(sc => [`${sc.repoOwner}/${sc.repoName}`, sc])
    );

    console.log(`🔍 Found ${existingScorecards.length} existing scorecards`);

    // Process scorecards sequentially with progress updates
    const scorecardResults = [];
    const total = topReposToAnalyze.length;

    for (let i = 0; i < topReposToAnalyze.length; i++) {
      const repoData = topReposToAnalyze[i];
      const current = i + 1;

      if (onProgress) {
        onProgress(current, total, repoData.repoName);
      }

      const repoKey = `${username}/${repoData.repoName}`;

      let result;

      // Check if we already have a recent scorecard for this repo
      if (existingScorecardMap.has(repoKey)) {
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
          const scorecardResult = await generateScorecardAnalysis({
            files: repoData.files,
            repoName: repoData.repoName,
          });

          console.log(`✅ Scorecard generated for ${repoData.repoName}`);

          // Save the generated scorecard to the database
          let inserted = null;
          for (let retryCount = 0; retryCount < 3; retryCount++) { // Retry logic for concurrent versioning
            const maxVersionResult = await db
              .select({ max: sql<number>`MAX(version)` })
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
                ref: 'main', // Assuming main, could be improved
                version: nextVersion,
                ...scorecardResult.scorecard,
              }).onConflictDoNothing().returning();
              if (insertResult) {
                inserted = insertResult;
                break;
              }
            } catch (e) {
              if (isPgErrorWithCode(e) && e.code === '23505') continue;
              throw e;
            }
          }
          if (!inserted) console.warn(`Failed to insert scorecard for ${repoData.repoName}`);

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

      if (result) {
        scorecardResults.push(result);
      }
    }

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

  console.log(`🤖 Generating developer profile with AI...`);

  // Validate that we have actual repos
  if (repos.length === 0) {
    throw new Error(`No public repositories found for user '${username}'. Cannot generate profile.`);
  }

  const prompt = `
    You are an expert Senior Engineering Manager creating a "Developer Profile" for GitHub user '${username}'.
    Analyze their public repositories metadata and the detailed code analysis from their scorecards to produce a fair, evidence-based assessment.
    For each scored metric, provide a score from 1 (novice) to 10 (expert) and a concise reason.
    Base your reasons on the provided data.
    Also provide 3-5 concrete, actionable suggestions for how this developer can improve.

    CRITICAL RULES:
    1. You MUST ONLY use repositories from the provided "Repository Metadata" section below
    2. DO NOT invent, hallucinate, or create fake repository names
    3. For each repository in topRepos, the "name" field MUST exactly match a repository name from the metadata
    4. Include up to 5 repositories in the topRepos array (or fewer if less than 5 exist)
    5. For significanceScore, use ONLY whole numbers from 1-10 (no decimals)

    Your entire output must be a single, valid JSON object that strictly adheres to the provided Zod schema.

    Repository Metadata (${repos.length} repositories available):
    ${JSON.stringify(repoDataForPrompt, null, 2)}
    ${scorecardInsights ? `\nDetailed Code Analysis from Scorecards:\n${scorecardInsights}` : ''}
  `;

  const { object, usage } = await generateObject({
    model: google('models/gemini-2.5-pro'),
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
          const match = repos.find(repo => repo.name === r.name || repo.url === r.url);
          return {
            ...r,
            owner: match?.owner || username,
            repo: match?.name || r.name,
          };
        })
      : [],
  };

  return {
    profile: patchedProfile,
    usage: totalUsage,
  };
} 