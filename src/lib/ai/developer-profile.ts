import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import type { RepoSummary } from '@/lib/github';
import { developerProfileSchema, type DeveloperProfile } from '@/lib/types/profile';
import { generateScorecardAnalysis } from './scorecard';
import { db } from '@/db';
import { repositoryScorecards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import type { ScorecardData } from '@/lib/types/scorecard';
import { Resend } from 'resend';
import { developerEmails } from '@/db/schema';
import { eq } from 'drizzle-orm';

const resend = new Resend(process.env.RESEND_API_KEY!);

/**
 * Find the real email of a GitHub user by scanning their commits in public repos.
 * Returns the most frequent non-noreply email, or null if none found.
 */
export async function findAndStoreDeveloperEmail(octokit: any, username: string, repos: { name: string }[]): Promise<string | null> {
  const emailCounts: Record<string, number> = {};
  let bestEmail: string | null = null;
  let bestRepo: string | null = null;
  for (const repo of repos) {
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

/**
 * Check if we have a cached scorecard for a repository
 */
async function getCachedScorecard(
  userId: string,
  repoOwner: string,
  repoName: string,
  files: Array<{ path: string; content: string }>
): Promise<{ scorecard: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } } | null> {
  try {
    // Generate file hashes to detect changes
    const fileHashes: Record<string, string> = {};
    files.forEach(file => {
      fileHashes[file.path] = createHash('md5').update(file.content).digest('hex');
    });

    // Check for cached scorecard
    const cached = await db
      .select()
      .from(repositoryScorecards)
      .where(
        and(
          eq(repositoryScorecards.userId, userId),
          eq(repositoryScorecards.repoOwner, repoOwner),
          eq(repositoryScorecards.repoName, repoName)
        )
      )
      .limit(1);

    if (cached.length > 0) {
      const scorecard = cached[0];
      const cachedHashes = scorecard.fileHashes || {};
      
      // Check if files have changed
      const filesChanged = Object.keys(fileHashes).some(path => 
        !cachedHashes[path] || cachedHashes[path] !== fileHashes[path]
      );

              if (!filesChanged) {
          console.log(`✅ Using cached scorecard for ${repoOwner}/${repoName}`);
          // TODO: Update to use new structured format
          return {
            scorecard: scorecard.markdown, // Use markdown for now
            usage: {
              promptTokens: 0, // No new tokens used
              completionTokens: 0,
              totalTokens: 0,
            }
          };
        }
    }

    return null;
  } catch (error) {
    console.warn(`Failed to check cached scorecard for ${repoOwner}/${repoName}:`, error);
    return null;
  }
}

/**
 * Cache a scorecard result for future use
 */
async function cacheScorecard(
  userId: string,
  repoOwner: string,
  repoName: string,
  scorecard: ScorecardData,
  files: Array<{ path: string; content: string }>
): Promise<void> {
  try {
    // Generate file hashes
    const fileHashes: Record<string, string> = {};
    files.forEach(file => {
      fileHashes[file.path] = createHash('md5').update(file.content).digest('hex');
    });

    // Cache the scorecard
    await db
      .insert(repositoryScorecards)
      .values({
        userId,
        repoOwner,
        repoName,
        ref: 'main',
        overallScore: scorecard.overallScore,
        metrics: scorecard.metrics,
        markdown: scorecard.markdown,
        fileHashes,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [repositoryScorecards.userId, repositoryScorecards.repoOwner, repositoryScorecards.repoName, repositoryScorecards.ref],
        set: {
          overallScore: scorecard.overallScore,
          metrics: scorecard.metrics,
          markdown: scorecard.markdown,
          fileHashes,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.warn(`Failed to cache scorecard for ${repoOwner}/${repoName}:`, error);
  }
}

/**
 * Generate a comprehensive developer profile using AI analysis of their repositories
 * Now leverages scorecard analysis for deeper insights with intelligent caching
 */
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
        // Check for cached scorecard first
        const cachedScorecard = await getCachedScorecard(
          userId,
          username,
          repoData.repoName,
          repoData.files
        );

        let scorecardResult;
        if (cachedScorecard) {
          // Use cached result
          scorecardResult = cachedScorecard;
        } else {
          // Generate new scorecard
          console.log(`🔄 Generating new scorecard for ${username}/${repoData.repoName}`);
          scorecardResult = await generateScorecardAnalysis({
            files: repoData.files,
            repoName: repoData.repoName,
          });
          
                            // Cache the result for future use
          await cacheScorecard(
            userId,
            username,
            repoData.repoName,
            scorecardResult.scorecard,
            repoData.files
          );
        }
        
        scorecardInsights += `\n\n## Repository: ${repoData.repoName}\n${scorecardResult.scorecard}\n`;
        
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
    
    Your entire output must be a single, valid JSON object that strictly adheres to the provided Zod schema.

    Repository Metadata:
    ${JSON.stringify(repoDataForPrompt, null, 2)}

    ${scorecardInsights ? `\nDetailed Code Analysis:\n${scorecardInsights}` : ''}
  `;

  const { object, usage } = await generateObject({
    model: google('models/gemini-2.5-flash'),
    schema: developerProfileSchema,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  // Add scorecard usage to total
  totalUsage.promptTokens += usage.promptTokens;
  totalUsage.completionTokens += usage.completionTokens;
  totalUsage.totalTokens += usage.totalTokens;

  return { 
    profile: object, 
    usage: totalUsage
  };
} 