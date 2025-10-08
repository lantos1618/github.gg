import { getInstallationOctokit, getUserFromInstallation } from './app';
import { analyzePullRequest } from '@/lib/ai/pr-analysis';
import { db } from '@/db';
import { tokenUsage, webhookPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PR_REVIEW_CONFIG } from '@/lib/config/pr-review';

interface PRCommentParams {
  installationId: number;
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  prDescription: string;
  baseBranch: string;
  headBranch: string;
}

/**
 * Post or update an AI-powered code review comment on a GitHub pull request.
 *
 * This function fetches all changed files from the PR (with pagination support),
 * filters out non-code files, analyzes the code using AI, and posts or updates
 * a review comment on the PR with the analysis results.
 *
 * @param params - The parameters for posting the PR review
 * @param params.installationId - GitHub App installation ID for authentication
 * @param params.owner - Repository owner (username or organization)
 * @param params.repo - Repository name
 * @param params.prNumber - Pull request number
 * @param params.prTitle - Title of the pull request
 * @param params.prDescription - Description/body of the pull request
 * @param params.baseBranch - Target branch name (e.g., 'main')
 * @param params.headBranch - Source branch name (e.g., 'feature/new-feature')
 *
 * @returns Promise resolving to an object containing:
 *   - success: boolean indicating if the operation succeeded
 *   - analysis: The AI analysis result object
 *   - commentId: ID of the created/updated comment (if it existed before)
 *
 * @throws Error if GitHub API calls fail or AI analysis fails
 *
 * @example
 * ```typescript
 * const result = await postPRReviewComment({
 *   installationId: 12345,
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   prNumber: 42,
 *   prTitle: 'Add new feature',
 *   prDescription: 'This PR adds...',
 *   baseBranch: 'main',
 *   headBranch: 'feature/new-feature'
 * });
 * ```
 */
export async function postPRReviewComment({
  installationId,
  owner,
  repo,
  prNumber,
  prTitle,
  prDescription,
  baseBranch,
  headBranch,
}: PRCommentParams) {
  try {
    const octokit = await getInstallationOctokit(installationId);

    // Get PR files with pagination support
    let allFiles: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data: files } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner,
        repo,
        pull_number: prNumber,
        per_page: PR_REVIEW_CONFIG.filesPerPage,
        page,
      });

      allFiles = allFiles.concat(files);

      // Stop if we've reached the end or hit our analysis limit
      hasMore = files.length === PR_REVIEW_CONFIG.filesPerPage && allFiles.length < PR_REVIEW_CONFIG.maxFilesToAnalyze * 2;
      page++;
    }

    // Filter to only analyze code files (skip lock files, generated files, etc.)
    const relevantFiles = allFiles.filter(file => {
      const ext = file.filename.split('.').pop()?.toLowerCase();

      return !PR_REVIEW_CONFIG.skipExtensions.includes(ext || '') &&
             !PR_REVIEW_CONFIG.skipPaths.some(path => file.filename.startsWith(path));
    });

    // Limit to configured max files to avoid token limits
    const filesToAnalyze = relevantFiles.slice(0, PR_REVIEW_CONFIG.maxFilesToAnalyze);

    console.log(`Analyzing ${filesToAnalyze.length} files for PR #${prNumber} in ${owner}/${repo}`);

    // Analyze the PR
    const analysisResult = await analyzePullRequest({
      prTitle,
      prDescription,
      changedFiles: filesToAnalyze.map(f => ({
        filename: f.filename,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      })),
      repoName: `${owner}/${repo}`,
      baseBranch,
      headBranch,
    });

    // Check if we already have a comment
    const { data: comments } = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find(comment =>
      comment.body?.includes(PR_REVIEW_CONFIG.commentMarker)
    );

    const commentBody = `${PR_REVIEW_CONFIG.commentMarker}\n${analysisResult.markdown}`;

    if (existingComment) {
      // Update existing comment
      await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      console.log(`Updated existing comment for PR #${prNumber}`);
    } else {
      // Create new comment
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
      console.log(`Created new comment for PR #${prNumber}`);
    }

    // Log token usage (skip if no user associated with installation)
    try {
      const user = await getUserFromInstallation(installationId);
      if (user) {
        await db.insert(tokenUsage).values({
          userId: user.id,
          feature: 'pr_review',
          repoOwner: owner,
          repoName: repo,
          model: PR_REVIEW_CONFIG.aiModel,
          promptTokens: analysisResult.usage.promptTokens,
          completionTokens: analysisResult.usage.completionTokens,
          totalTokens: analysisResult.usage.totalTokens,
          isByok: false,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to log token usage:', error);
    }

    return {
      success: true,
      analysis: analysisResult.analysis,
      commentId: existingComment?.id,
    };
  } catch (error) {
    console.error('Error posting PR review comment:', error);
    throw error;
  }
}

/**
 * Check if automated PR reviews are enabled for a specific repository.
 *
 * This function checks the webhook preferences for the given installation to determine
 * if PR reviews should be posted. It returns true if:
 * 1. No preferences are found (default behavior)
 * 2. PR reviews are globally enabled AND the repo is not in the exclusion list
 *
 * @param installationId - GitHub App installation ID
 * @param owner - Repository owner (username or organization)
 * @param repo - Repository name
 *
 * @returns Promise<boolean> - true if PR reviews should be posted, false otherwise
 *
 * @example
 * ```typescript
 * const isEnabled = await isPRReviewEnabled(12345, 'myorg', 'myrepo');
 * if (isEnabled) {
 *   await postPRReviewComment({...});
 * }
 * ```
 */
export async function isPRReviewEnabled(installationId: number, owner: string, repo: string): Promise<boolean> {
  try {
    // Check webhook preferences for this installation
    const prefs = await db.query.webhookPreferences.findFirst({
      where: eq(webhookPreferences.installationId, installationId),
    });

    // If no preferences found, default to enabled
    if (!prefs) {
      return true;
    }

    // Check if PR reviews are globally disabled
    if (!prefs.prReviewEnabled) {
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
    console.error('Error checking PR review preferences:', error);
    // On error, default to enabled
    return true;
  }
}
