import { getInstallationOctokit, getUserFromInstallation } from './app';
import { analyzePullRequest } from '@/lib/ai/pr-analysis';
import { db } from '@/db';
import { tokenUsage, webhookPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

const GITHUB_GG_COMMENT_MARKER = '<!-- github.gg-ai-review -->';

/**
 * Post or update an AI review comment on a PR
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

    // Get PR files
    const { data: files } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    // Filter to only analyze code files (skip lock files, generated files, etc.)
    const relevantFiles = files.filter(file => {
      const ext = file.filename.split('.').pop()?.toLowerCase();
      const skipExtensions = ['lock', 'json', 'md', 'txt', 'svg', 'png', 'jpg', 'gif'];
      const skipPaths = ['node_modules/', 'dist/', 'build/', '.next/', 'coverage/'];

      return !skipExtensions.includes(ext || '') &&
             !skipPaths.some(path => file.filename.startsWith(path));
    });

    // Limit to first 20 files to avoid token limits
    const filesToAnalyze = relevantFiles.slice(0, 20);

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
      comment.body?.includes(GITHUB_GG_COMMENT_MARKER)
    );

    const commentBody = `${GITHUB_GG_COMMENT_MARKER}\n${analysisResult.markdown}`;

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
          model: 'gemini-2.5-pro',
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
 * Check if a repository has PR review enabled
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
