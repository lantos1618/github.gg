import type { RepoSummary } from '@/lib/github';
import { type DeveloperProfile, type ScoredRepo } from '@/lib/types/profile';
import { db } from '@/db';
import { Resend } from 'resend';
import { developerEmails, repositoryScorecards } from '@/db/schema';
import type { Octokit } from '@octokit/rest';
import { GEMINI_PRO } from './models';
import { generateObject } from 'ai';
import { developerProfileSchema } from '@/lib/types/profile';
import { generateScorecardAnalysis, type ScorecardAnalysisResult } from './scorecard';
import { and, eq, sql, inArray } from 'drizzle-orm';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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
 * - Max 6 repos scanned (3 own + 3 cross-repo)
 * - Max 10 commits per repo
 * - Max 3 patch fetches total (expensive fallback)
 */
const MAX_REPOS_TO_SCAN = 6;
const MAX_COMMITS_PER_REPO = 10;
const MAX_PATCH_FETCHES = 3;

export type EmailExtractionSource = 'database' | 'github_commits' | 'patch' | 'not_found';

export type EmailExtractionResult = {
  email: string | null;
  source: EmailExtractionSource;
};

/**
 * Scan the supplied repos for the user's real (non-noreply) email and persist it.
 *
 * The `repos` list must include the REAL owner of each repo — we previously
 * hardcoded `username` as the owner, which 404'd the patch fetch for any repo
 * the user contributes to but doesn't own (e.g. badlogic committing to
 * cloudflare/cloudflare-docs). Threading the real owner through is the fix.
 */
export async function findAndStoreDeveloperEmail(
  octokit: Octokit,
  username: string,
  repos: { owner: string; name: string }[]
): Promise<EmailExtractionResult> {
  const emailCounts: Record<string, number> = {};
  let bestEmail: string | null = null;
  let bestRepo: string | null = null;
  let bestSource: 'github_commits' | 'patch' | null = null;
  let patchFetchCount = 0;

  // Cap total repos scanned. Callers should already pass a deduped list of
  // "own repos + cross-repo contribution repos" up to this many entries.
  const reposToScan = repos.slice(0, MAX_REPOS_TO_SCAN);
  if (process.env.DEBUG_AI === 'true') console.log(`📧 Scanning ${reposToScan.length} repos for email (max ${MAX_REPOS_TO_SCAN})`);

  for (const repo of reposToScan) {
    // Early exit if we already found a good email
    if (bestEmail && emailCounts[bestEmail] >= 3) {
      if (process.env.DEBUG_AI === 'true') console.log(`📧 Found confident email (${emailCounts[bestEmail]} occurrences), stopping scan`);
      break;
    }

    try {
      const { data: commits } = await octokit.repos.listCommits({
        owner: repo.owner,
        repo: repo.name,
        per_page: MAX_COMMITS_PER_REPO
      });

      for (const commit of commits) {
        const login = commit.author?.login;
        let email = commit.commit?.author?.email;
        let foundViaPatch = false;

        // If no email in API response or it's a noreply email, try fetching the patch as fallback
        // But limit patch fetches to avoid too many requests
        if (
          login === username &&
          (!email || email.includes('noreply.github.com') || email.endsWith('@github.com')) &&
          patchFetchCount < MAX_PATCH_FETCHES
        ) {
          try {
            patchFetchCount++;
            const patchUrl = `https://github.com/${repo.owner}/${repo.name}/commit/${commit.sha}.patch`;
            console.log(`[email-extract] fetching ${repo.owner}/${repo.name}/${commit.sha}.patch (counter ${patchFetchCount}/${MAX_PATCH_FETCHES})`);
            const patchResponse = await fetch(patchUrl);
            if (patchResponse.ok) {
              const patchText = await patchResponse.text();
              const patchEmail = extractEmailFromPatch(patchText);
              if (patchEmail) {
                email = patchEmail;
                foundViaPatch = true;
                if (process.env.DEBUG_AI === 'true') console.log(`✉️  Found email from patch for ${username}: ${email}`);
              }
            } else {
              console.log(`[email-extract] patch failed for ${repo.owner}/${repo.name}/${commit.sha}: ${patchResponse.status}`);
            }
          } catch (patchError) {
            const status = patchError instanceof Error ? patchError.message : String(patchError);
            console.log(`[email-extract] patch failed for ${repo.owner}/${repo.name}/${commit.sha}: ${status}`);
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
            bestRepo = `${repo.owner}/${repo.name}`;
            bestSource = foundViaPatch ? 'patch' : 'github_commits';
          }
        }
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 409) {
        if (process.env.DEBUG_AI === 'true') console.log(`Skipping empty repository: ${repo.owner}/${repo.name}`);
        continue;
      }
      console.warn(`Error fetching commits for ${repo.owner}/${repo.name}:`, err.message);
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
    return { email: bestEmail, source: bestSource ?? 'github_commits' };
  }
  return { email: null, source: 'not_found' };
}

/**
 * Send a developer profile report to the given email using Resend.
 */
export async function sendDeveloperProfileEmail(email: string, profileHtml: string) {
  if (!resend) {
    if (process.env.DEBUG_AI === 'true') console.log('Resend not configured - skipping email send');
    return;
  }

  await resend.emails.send({
    from: 'noreply@github.gg',
    to: email,
    subject: 'Your GitHub.gg Developer Profile',
    html: profileHtml,
  });
}

export type CrossRepoCommit = {
  repoOwner: string;
  repoName: string;
  sha: string;
  message: string;
  date: string;
};

export type DeveloperProfileParams = {
  username: string;
  repos: RepoSummary[];
  repoFiles?: Array<{
    repoName: string;
    // ACTUAL repo owner from the GitHub metadata — required so we write the
    // scorecard under the correct (owner, repo) instead of assuming
    // owner === profile username. Org-owned repos in the user's accessible
    // list, or any case-differing owner, would otherwise be hidden from
    // /<owner>/<repo>/scorecard.
    owner: string;
    // ACTUAL default branch from the repo (not 'main' as a fallback) so the
    // scorecard row's ref matches what the read path filters on.
    defaultBranch: string;
    files: Array<{ path: string; content: string }>;
  }>;
  userId: string; // userId is now required to associate scorecards
  onProgress?: (current: number, total: number, repoName: string) => void;
  forceRefreshScorecards?: boolean; // When true, regenerate all scorecards even if cached
  // Recent public commits the user has pushed to repos they DON'T own.
  // Signal-only — we deliberately do NOT generate scorecards for these.
  crossRepoCommits?: CrossRepoCommit[];
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
  forceRefreshScorecards = false,
  crossRepoCommits,
}: Omit<DeveloperProfileParams, 'onProgress'>): AsyncGenerator<{
  type: 'progress' | 'complete' | 'repo_failed';
  progress?: number;
  message?: string;
  metadata?: { current: number; total: number; repoName: string };
  result?: DeveloperProfileResult;
  failedRepo?: string;
  failedReason?: string;
}> {
  // Filter out forked repositories - we only want to score based on user's original work
  const nonForkedRepos = repos.filter(repo => !repo.fork);

  if (process.env.DEBUG_AI === 'true') console.log(`📊 Total repos: ${repos.length}, Non-forked: ${nonForkedRepos.length}, Filtered out: ${repos.length - nonForkedRepos.length} forks`);

  const repoDataForPrompt = nonForkedRepos.slice(0, 20).map(repo => ({
    name: repo.name,
    owner: repo.owner,
    language: repo.language,
    description: repo.description,
    stars: repo.stargazersCount,
    topics: repo.topics,
  }));

  // Calculate total stars and max stars for AI context
  const totalStars = nonForkedRepos.reduce((sum, repo) => sum + (repo.stargazersCount || 0), 0);
  const maxStars = Math.max(...nonForkedRepos.map(repo => repo.stargazersCount || 0), 0);

  const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let scorecardInsights = '';
  let scorecardResults: Array<{ repoName: string; scorecard: ScorecardAnalysisResult['scorecard']; usage: ScorecardAnalysisResult['usage'] }> = [];

  if (repoFiles && repoFiles.length > 0) {
    // Allow up to 15 repos when user explicitly selects them via Configure
    const topReposToAnalyze = repoFiles.slice(0, 15);
    const repoNames = topReposToAnalyze.map(r => r.repoName);

    if (forceRefreshScorecards) {
      if (process.env.DEBUG_AI === 'true') console.log(`🔄 Force refresh enabled - will regenerate all ${topReposToAnalyze.length} scorecards`);
    }

    // Batch query: fetch existing scorecards. We key by the ACTUAL repo owner
    // (not username) so org-owned repos in the user's accessible list match
    // their real /<owner>/<repo>/scorecard URL.
    const normalizedRepoNames = repoNames.map(name => name.toLowerCase());
    const repoOwners = Array.from(new Set(topReposToAnalyze.map(r => r.owner.toLowerCase())));
    const existingScorecards = await db
      .select()
      .from(repositoryScorecards)
      .where(and(
        eq(repositoryScorecards.userId, userId),
        inArray(repositoryScorecards.repoOwner, repoOwners),
        inArray(repositoryScorecards.repoName, normalizedRepoNames)
      ));

    // Map uses (owner/name) lowercase keys for case-insensitive lookup.
    const existingScorecardMap = new Map(
      existingScorecards.map(sc => [`${sc.repoOwner.toLowerCase()}/${sc.repoName.toLowerCase()}`, sc])
    );

    if (process.env.DEBUG_AI === 'true') console.log(`🔍 Found ${existingScorecards.length} existing scorecards`);

    // Process scorecards in parallel for better performance
    const total = topReposToAnalyze.length;
    let completed = 0;

    // Create promises for all repos
    const scorecardPromises = topReposToAnalyze.map(async (repoData) => {
      const normalizedRepoOwner = repoData.owner.toLowerCase();
      const normalizedRepoName = repoData.repoName.toLowerCase();
      const repoKey = `${normalizedRepoOwner}/${normalizedRepoName}`;
      let result;

      // Check if we already have a recent scorecard for this repo (skip if force refresh)
      if (!forceRefreshScorecards && existingScorecardMap.has(repoKey)) {
        if (process.env.DEBUG_AI === 'true') console.log(`✅ Using cached scorecard for ${repoKey}`);
        const existing = existingScorecardMap.get(repoKey);
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
          if (process.env.DEBUG_AI === 'true') console.log(`🔍 Analyzing ${repoKey}...`);

          // 180s — generateScorecardAnalysis auto-chunks large repos and the
          // synthesis pass alone can take 60–90s. 60s was making large repos
          // (e.g. github.gg) fail silently inside profile generation while
          // the direct /<o>/<r>/scorecard route succeeded.
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: Scorecard generation for ${repoKey} exceeded 180s`)), 180000)
          );

          const scorecardResult = await Promise.race([
            generateScorecardAnalysis({
              files: repoData.files,
              repoName: repoData.repoName,
            }),
            timeoutPromise
          ]) as ScorecardAnalysisResult;

          if (process.env.DEBUG_AI === 'true') console.log(`✅ Scorecard generated for ${repoKey}`);

          // Write under the actual repo owner + actual default branch. Using
          // the profile username + 'main' fallback previously meant org-owned
          // repos or 'master'-default repos were stored under keys the read
          // path never queried — the root cause of "profile said it scored
          // this repo, but /<o>/<r>/scorecard shows nothing".
          const repoRef = repoData.defaultBranch || 'main';
          if (process.env.DEBUG_AI === 'true') console.log(`Saving scorecard for ${normalizedRepoOwner}/${normalizedRepoName}@${repoRef}, userId: ${userId}`);
          try {
            await db.execute(sql`
              INSERT INTO repository_scorecards (id, "userId", repo_owner, repo_name, ref, version, is_private, overall_score, metrics, markdown, created_at, updated_at)
              SELECT gen_random_uuid(), ${userId}, ${normalizedRepoOwner}, ${normalizedRepoName}, ${repoRef},
                     COALESCE(MAX(version), 0) + 1,
                     false, ${scorecardResult.scorecard.overallScore},
                     ${JSON.stringify(scorecardResult.scorecard.metrics)}::jsonb,
                     ${scorecardResult.scorecard.markdown},
                     NOW(), NOW()
              FROM repository_scorecards
              WHERE "userId" = ${userId} AND repo_owner = ${normalizedRepoOwner} AND repo_name = ${normalizedRepoName}
            `);
            if (process.env.DEBUG_AI === 'true') console.log(`Successfully saved scorecard for ${normalizedRepoOwner}/${normalizedRepoName}`);

            result = {
              repoName: repoData.repoName,
              scorecard: scorecardResult.scorecard,
              usage: scorecardResult.usage,
            };
          } catch (e) {
            // DB write failed but the AI work succeeded. Surface this as a
            // per-repo failure rather than silently swallowing — previously
            // the outer settle handler still saw a "success" because result
            // was set from the in-memory scorecard, and the user was left
            // wondering why /<o>/<r>/scorecard showed nothing.
            console.error(`Failed to insert scorecard for ${normalizedRepoOwner}/${normalizedRepoName}:`, e);
            throw e instanceof Error ? e : new Error(String(e));
          }
        } catch (error) {
          console.warn(`Failed to generate or save scorecard for ${repoData.repoName}:`, error);
          result = null;
        }
      }

      return { repoName: repoData.repoName, result };
    });

    // Use Promise.allSettled with progress updates via a heartbeat
    const resultsMap = new Map<string, { repoName: string; scorecard: ScorecardAnalysisResult['scorecard']; usage: ScorecardAnalysisResult['usage'] }>();
    const failures: Array<{ repo: string; reason: string }> = [];
    let completedCount = 0;

    try {
      // Wait for all promises to settle (with individual timeouts already in place)
      const settledResults = await Promise.allSettled(scorecardPromises);

      settledResults.forEach((settled, index) => {
        const repoName = topReposToAnalyze[index].repoName;
        completedCount++;

        if (settled.status === 'fulfilled' && settled.value.result) {
          resultsMap.set(repoName, settled.value.result);
        } else {
          const errorRaw = settled.status === 'rejected' ? settled.reason : 'Unknown error';
          const reason = errorRaw instanceof Error ? errorRaw.message : String(errorRaw);
          console.warn(`❌ Scorecard generation failed for ${repoName}:`, errorRaw);
          failures.push({ repo: repoName, reason });
        }
      });
    } finally {
      // settled
    }

    // Surface per-repo failures so the client UI doesn't silently report success
    // when specific scorecards never got written. Previously caught at line 323
    // and only console.warn'd, leaving e.g. lantos1618/github.gg silently absent
    // from /<o>/<r>/scorecard after a "successful" profile generation.
    for (const f of failures) {
      yield {
        type: 'repo_failed',
        failedRepo: f.repo,
        failedReason: f.reason,
        message: `Scorecard for ${f.repo} failed: ${f.reason}`,
      };
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
    
    scorecardResults = Array.from(resultsMap.values());

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
  if (process.env.DEBUG_AI === 'true') console.log(`🤖 Generating developer profile with AI...`);

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

    Repository Metadata (${nonForkedRepos.length} original repositories, ${totalStars.toLocaleString()} total stars):
    ${JSON.stringify(repoDataForPrompt, null, 2)}
    ${crossRepoCommits && crossRepoCommits.length > 0 ? `
Cross-Repo Contributions (commits to others' repos — signal only, no scorecards generated):
${crossRepoCommits.map(c => {
  const preview = c.message.split('\n')[0].slice(0, 100);
  return `- ${c.repoOwner}/${c.repoName}: "${preview}" (${c.date.slice(0, 10)})`;
}).join('\n')}
` : ''}
    ${scorecardInsights ? `\nDetailed Code Analysis from Scorecards:\n${scorecardInsights}` : ''}
  `;

  try {
    if (process.env.DEBUG_AI === 'true') console.log(`📊 Prompt length: ${prompt.length} characters, Repos: ${nonForkedRepos.length}, Scorecards: ${scorecardResults.length}`);
    
    // Add timeout wrapper (120 seconds for AI generation)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI profile generation timed out after 120 seconds`)), 120000)
    );

    if (process.env.DEBUG_AI === 'true') console.log(`🚀 Calling AI model...`);
    const { object, usage } = await Promise.race([
      generateObject({
        model: GEMINI_PRO,
        schema: developerProfileSchema,
        messages: [{ role: 'user', content: prompt }],
      }),
      timeoutPromise,
    ]);
    
    if (process.env.DEBUG_AI === 'true') console.log(`✅ AI profile generation completed`);

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
  } catch (error) {
    // Log full error details for Vercel error tracking
    const errorDetails = {
      username,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      promptLength: prompt.length,
      repoCount: nonForkedRepos.length,
      scorecardCount: scorecardResults.length,
    };
    
    console.error(`❌ Error generating AI profile for ${username}:`, JSON.stringify(errorDetails, null, 2));
    
    // Re-throw with full context for Vercel to catch
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during AI profile generation';
    const enhancedError = new Error(`Failed to generate profile for ${username}: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      enhancedError.stack = error.stack;
    }
    throw enhancedError;
  }
} 
