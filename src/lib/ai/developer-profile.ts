import type { RepoSummary } from '@/lib/github';
import { type DeveloperProfile, type ScoredRepo } from '@/lib/types/profile';
import { db } from '@/db';
import { Resend } from 'resend';
import { developerEmails } from '@/db/schema';
import type { Octokit } from '@octokit/rest';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { developerProfileSchema } from '@/lib/types/profile';
import { generateScorecardAnalysis } from './scorecard';

const resend = new Resend(process.env.RESEND_API_KEY!);

/**
 * Find the real email of a GitHub user by scanning their commits in public repos.
 * Returns the most frequent non-noreply email, or null if none found.
 */
export async function findAndStoreDeveloperEmail(octokit: Octokit, username: string, repos: { name: string }[]): Promise<string | null> {
  const emailCounts: Record<string, number> = {};
  let bestEmail: string | null = null;
  let bestRepo: string | null = null;
  
  for (const repo of repos) {
    try {
      const { data: commits } = await octokit.repos.listCommits({ owner: username, repo: repo.name, per_page: 30 });
      for (const commit of commits) {
        const email = commit.commit?.author?.email;
        const login = commit.author?.login;
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
      // Skip empty repositories or other errors
      const err = error as { status?: number; message?: string };
      if (err.status === 409) {
        console.log(`Skipping empty repository: ${repo.name}`);
        continue;
      }
      // Log other errors but continue processing
      console.warn(`Error fetching commits for ${repo.name}:`, err.message);
      continue;
    }
  }
  
  if (bestEmail) {
    // Upsert into developer_emails table
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
  userId?: string; // For caching scorecard results
};

export type DeveloperProfileResult = {
  profile: DeveloperProfile;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export async function generateDeveloperProfile(
  username: string, 
  repos: RepoSummary[],
  repoFiles?: Array<{
    repoName: string;
    files: Array<{ path: string; content: string }>;
  }>,
  userId?: string
): Promise<DeveloperProfileResult> {
  // Prepare repository metadata
  const repoDataForPrompt = repos.slice(0, 20).map(repo => ({
    name: repo.name,
    owner: repo.owner, // NEW
    repo: repo.name,   // NEW
    language: repo.language,
    description: repo.description,
    stars: repo.stargazersCount,
    topics: repo.topics,
  }));

  // Generate scorecard analysis for top repositories if files are provided
  const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let scorecardInsights = '';

  if (repoFiles && repoFiles.length > 0 && userId) {
    const topRepos = repoFiles.slice(0, 5); // Analyze top 5 repos for efficiency
    for (const repoData of topRepos) {
      try {
          // Generate new scorecard
        const scorecardResult = await generateScorecardAnalysis({
            files: repoData.files,
            repoName: repoData.repoName,
          });
        scorecardInsights += `\n\n## Repository: ${repoData.repoName}\n${scorecardResult.scorecard}`;
        // Accumulate token usage
        totalUsage.promptTokens += scorecardResult.usage.promptTokens;
        totalUsage.completionTokens += scorecardResult.usage.completionTokens;
        totalUsage.totalTokens += scorecardResult.usage.totalTokens;
      } catch (error) {
        console.warn(`Failed to analyze ${repoData.repoName}:`, error);
        // Continue with other repos even if one fails
      }
    }
  }

  const prompt = `
    You are an expert Senior Engineering Manager creating a "Developer Score Card" for GitHub user '${username}'.
    Analyze their public repositories to produce a fair, evidence-based assessment.
    For each scored metric, provide a score from 1 (novice) to 10 (expert) and a concise reason for your score. 
    Base your reasons on the provided repository data and scorecard analysis.
    In addition to the summary and scores, provide 3-5 concrete, actionable suggestions for how this developer can improve or what they should focus on next. These should be included as a 'suggestions' array of strings in your output.
    Your entire output must be a single, valid JSON object that strictly adheres to the provided Zod schema.
    Repository Metadata:
    ${JSON.stringify(repoDataForPrompt, null, 2)}
    ${scorecardInsights ? `\nDetailed Code Analysis:\n${scorecardInsights}` : ''}
  `;

  const { object, usage } = await generateObject({
    model: google('models/gemini-2.5-pro'),
    schema: developerProfileSchema,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  // Add scorecard usage to total
  totalUsage.promptTokens += usage.promptTokens;
  totalUsage.completionTokens += usage.completionTokens;
  totalUsage.totalTokens += usage.totalTokens;

  // After AI returns the profile, patch topRepos to include owner/repo fields
  const patchedProfile = {
    ...object,
    topRepos: Array.isArray(object.topRepos)
      ? object.topRepos.map((r: ScoredRepo) => {
          // Try to find the matching repo in the input repos
          const match = repos.find(
            repo => repo.name === r.name || repo.url === r.url
          );
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