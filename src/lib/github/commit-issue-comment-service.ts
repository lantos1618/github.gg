import { getInstallationOctokit, getUserFromInstallation } from './app';
import { analyzeCommit } from '@/lib/ai/commit-analysis';
import { analyzeIssue } from '@/lib/ai/issue-analysis';
import { db } from '@/db';
import { tokenUsage, webhookPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPlanAndKey, getApiKeyForUser } from '@/lib/utils/user-plan';
import { escapeHtmlEntities } from '@/lib/utils/sanitize';
import {
  getFreeTierStatus,
  incrementFreeReviewsUsed,
  getPlatformApiKey,
  freeTierFooter,
} from './free-tier';

type FreeTierState = { used: number; remaining: number; total: number } | null;
type KeyInfo = { apiKey: string; isByok: boolean };

async function resolveKeyAndTier(
  userId: string,
  installationId: number,
): Promise<{ keyInfo: KeyInfo; freeTier: FreeTierState } | { skip: 'no_api_key' | 'free_tier_exhausted' }> {
  const { subscription, plan } = await getUserPlanAndKey(userId);
  const isPaid = !!subscription && subscription.status === 'active';
  const paidKey = isPaid ? await getApiKeyForUser(userId, plan) : null;
  if (paidKey) return { keyInfo: paidKey, freeTier: null };

  const platformKey = getPlatformApiKey();
  if (!platformKey) return { skip: 'no_api_key' };
  const status = await getFreeTierStatus(installationId);
  if (status.remaining <= 0) return { skip: 'free_tier_exhausted' };
  return { keyInfo: { apiKey: platformKey, isByok: false }, freeTier: status };
}

const COMMIT_COMMENT_MARKER = '<!-- gh.gg commit analysis -->';
const ISSUE_COMMENT_MARKER = '<!-- gh.gg issue analysis -->';

interface CommitCommentParams {
  installationId: number;
  owner: string;
  repo: string;
  commitSha: string;
}

interface IssueCommentParams {
  installationId: number;
  owner: string;
  repo: string;
  issueNumber: number;
}

/**
 * Post or update an AI-powered analysis comment on a GitHub commit.
 */
export async function postCommitAnalysisComment({
  installationId,
  owner,
  repo,
  commitSha,
}: CommitCommentParams) {
  try {
    const user = await getUserFromInstallation(installationId);
    if (!user) {
      console.log(`Skipping commit analysis for ${commitSha}: no user associated with installation`);
      return { success: false, skipped: true, reason: 'no_user' };
    }

    const resolved = await resolveKeyAndTier(user.id, installationId);
    if ('skip' in resolved) {
      console.log(`Skipping commit analysis for ${commitSha}: ${resolved.skip}`);
      return { success: false, skipped: true, reason: resolved.skip };
    }
    const { keyInfo, freeTier } = resolved;

    const octokit = await getInstallationOctokit(installationId);

    // Get commit details
    const { data: commit } = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
      owner,
      repo,
      ref: commitSha,
    });

    // Get commit files (limit to 10 to avoid token limits)
    const files = commit.files?.slice(0, 10) || [];

    const startTime = Date.now();

    // Sanitize inputs
    const sanitizedMessage = escapeHtmlEntities(commit.commit.message);

    // Analyze the commit
    const analysisResult = await analyzeCommit({
      commitMessage: sanitizedMessage,
      commitSha: commit.sha,
      author: {
        name: commit.commit.author?.name || 'Unknown',
        email: commit.commit.author?.email || 'unknown@email.com',
      },
      changedFiles: files.map(f => ({
        filename: f.filename,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      })),
      repoName: `${owner}/${repo}`,
      branch: commit.commit.tree.sha,
    });

    const analysisTime = Date.now() - startTime;
    console.log(`Commit analysis completed in ${analysisTime}ms (${analysisResult.usage.totalTokens} tokens)`);

    // Check if we already have a comment
    const { data: comments } = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/comments', {
      owner,
      repo,
      commit_sha: commitSha,
    });

    const existingComment = comments.find(comment =>
      comment.body?.includes(COMMIT_COMMENT_MARKER)
    );

    const commitFooter = freeTier ? freeTierFooter(freeTier.remaining - 1, 'commit_analysis') : '';
    const commentBody = `${COMMIT_COMMENT_MARKER}\n${analysisResult.markdown}${commitFooter}`;

    if (existingComment) {
      // Update existing comment
      await octokit.request('PATCH /repos/{owner}/{repo}/comments/{comment_id}', {
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      console.log(`Updated existing comment for commit ${commitSha.slice(0, 7)}`);
    } else {
      // Create new comment
      await octokit.request('POST /repos/{owner}/{repo}/commits/{commit_sha}/comments', {
        owner,
        repo,
        commit_sha: commitSha,
        body: commentBody,
      });
      console.log(`Created new comment for commit ${commitSha.slice(0, 7)}`);
    }

    // Log token usage
    try {
      await db.insert(tokenUsage).values({
        userId: user.id,
        feature: 'commit_analysis',
        repoOwner: owner,
        repoName: repo,
        model: 'gemini-3.1-pro-preview',
        inputTokens: analysisResult.usage.inputTokens,
        outputTokens: analysisResult.usage.outputTokens,
        totalTokens: analysisResult.usage.totalTokens,
        isByok: keyInfo.isByok,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to log token usage:', error);
    }

    if (freeTier) {
      try { await incrementFreeReviewsUsed(installationId); }
      catch (e) { console.error('Failed to increment free-tier counter:', e); }
    }

    return {
      success: true,
      analysis: analysisResult.analysis,
      commentId: existingComment?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error posting commit analysis for ${commitSha.slice(0, 7)} in ${owner}/${repo}:`, errorMessage);
    throw new Error(`Failed to post commit analysis: ${errorMessage}`);
  }
}

/**
 * Post or update an AI-powered analysis comment on a GitHub issue.
 */
export async function postIssueAnalysisComment({
  installationId,
  owner,
  repo,
  issueNumber,
}: IssueCommentParams) {
  try {
    const user = await getUserFromInstallation(installationId);
    if (!user) {
      console.log(`Skipping issue analysis for #${issueNumber}: no user associated with installation`);
      return { success: false, skipped: true, reason: 'no_user' };
    }

    const resolved = await resolveKeyAndTier(user.id, installationId);
    if ('skip' in resolved) {
      console.log(`Skipping issue analysis for #${issueNumber}: ${resolved.skip}`);
      return { success: false, skipped: true, reason: resolved.skip };
    }
    const { keyInfo, freeTier } = resolved;

    const octokit = await getInstallationOctokit(installationId);

    // Get issue details
    const { data: issue } = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
      owner,
      repo,
      issue_number: issueNumber,
    });

    // Get repository info for context
    const { data: repoData } = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
    });

    const startTime = Date.now();

    // Sanitize inputs
    const sanitizedTitle = escapeHtmlEntities(issue.title);
    const sanitizedBody = escapeHtmlEntities(issue.body || '');

    // Analyze the issue
    const analysisResult = await analyzeIssue({
      issueTitle: sanitizedTitle,
      issueBody: sanitizedBody,
      issueNumber: issue.number,
      author: {
        login: issue.user?.login || 'unknown',
        type: issue.user?.type || 'User',
      },
      labels: issue.labels.map(label => typeof label === 'string' ? label : label.name || ''),
      repoName: `${owner}/${repo}`,
      repoDescription: repoData.description || undefined,
    });

    const analysisTime = Date.now() - startTime;
    console.log(`Issue analysis completed in ${analysisTime}ms (${analysisResult.usage.totalTokens} tokens)`);

    // Check if we already have a comment
    const { data: comments } = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: issueNumber,
    });

    const existingComment = comments.find(comment =>
      comment.body?.includes(ISSUE_COMMENT_MARKER)
    );

    const issueFooter = freeTier ? freeTierFooter(freeTier.remaining - 1, 'issue_analysis') : '';
    const commentBody = `${ISSUE_COMMENT_MARKER}\n${analysisResult.markdown}${issueFooter}`;

    if (existingComment) {
      // Update existing comment
      await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      console.log(`Updated existing comment for issue #${issueNumber}`);
    } else {
      // Create new comment
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: issueNumber,
        body: commentBody,
      });
      console.log(`Created new comment for issue #${issueNumber}`);
    }

    // Log token usage
    try {
      await db.insert(tokenUsage).values({
        userId: user.id,
        feature: 'issue_analysis',
        repoOwner: owner,
        repoName: repo,
        model: 'gemini-3.1-pro-preview',
        inputTokens: analysisResult.usage.inputTokens,
        outputTokens: analysisResult.usage.outputTokens,
        totalTokens: analysisResult.usage.totalTokens,
        isByok: keyInfo.isByok,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to log token usage:', error);
    }

    if (freeTier) {
      try { await incrementFreeReviewsUsed(installationId); }
      catch (e) { console.error('Failed to increment free-tier counter:', e); }
    }

    return {
      success: true,
      analysis: analysisResult.analysis,
      commentId: existingComment?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error posting issue analysis for #${issueNumber} in ${owner}/${repo}:`, errorMessage);
    throw new Error(`Failed to post issue analysis: ${errorMessage}`);
  }
}

/**
 * Check if automated commit/issue analysis is enabled for a specific repository.
 */
export async function isAnalysisEnabled(installationId: number, owner: string, repo: string): Promise<boolean> {
  try {
    const prefs = await db.query.webhookPreferences.findFirst({
      where: eq(webhookPreferences.installationId, installationId),
    });

    // If no preferences found, default to enabled
    if (!prefs) {
      return true;
    }

    // Check if automations are globally disabled
    if (!prefs.autoUpdateEnabled) {
      return false;
    }

    // Check if this specific repo is excluded
    const fullRepoName = `${owner}/${repo}`;
    const excludedRepos = (prefs.excludedRepos as string[]) || [];
    if (excludedRepos.includes(fullRepoName)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking analysis preferences:', error);
    // On error, default to enabled
    return true;
  }
}
