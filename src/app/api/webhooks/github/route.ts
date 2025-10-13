import { Webhooks } from '@octokit/webhooks';
import { db } from '@/db';
import { githubAppInstallations, installationRepositories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { postPRReviewComment, isPRReviewEnabled } from '@/lib/github/pr-comment-service';
import { postCommitAnalysisComment, postIssueAnalysisComment, isAnalysisEnabled } from '@/lib/github/commit-issue-comment-service';

// Only initialize webhooks if the secret is available
const webhooks = process.env.GITHUB_WEBHOOK_SECRET
  ? new Webhooks({
      secret: process.env.GITHUB_WEBHOOK_SECRET,
    })
  : null;

// Background handler for PR analysis
async function handlePRAnalysis({
  installationId,
  owner,
  repo,
  prNumber,
  prTitle,
  prDescription,
  baseBranch,
  headBranch,
}: {
  installationId?: number;
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  prDescription: string;
  baseBranch: string;
  headBranch: string;
}) {
  if (!installationId) {
    console.error('No installation ID provided for PR analysis');
    return;
  }

  // Check if PR review is enabled for this repo
  const isEnabled = await isPRReviewEnabled(installationId, owner, repo);
  if (!isEnabled) {
    console.log(`PR review not enabled for ${owner}/${repo}`);
    return;
  }

  console.log(`Starting PR analysis for #${prNumber} in ${owner}/${repo}`);

  try {
    await postPRReviewComment({
      installationId,
      owner,
      repo,
      prNumber,
      prTitle,
      prDescription,
      baseBranch,
      headBranch,
    });
    console.log(`Successfully posted review for PR #${prNumber} in ${owner}/${repo}`);
  } catch (error) {
    console.error(`Failed to post review for PR #${prNumber}:`, error);
  }
}

// Background handler for commit analysis
async function handleCommitAnalysis({
  installationId,
  owner,
  repo,
  commitSha,
}: {
  installationId?: number;
  owner: string;
  repo: string;
  commitSha: string;
}) {
  if (!installationId) {
    console.error('No installation ID provided for commit analysis');
    return;
  }

  // Check if analysis is enabled for this repo
  const isEnabled = await isAnalysisEnabled(installationId, owner, repo);
  if (!isEnabled) {
    console.log(`Commit analysis not enabled for ${owner}/${repo}`);
    return;
  }

  console.log(`Starting commit analysis for ${commitSha.slice(0, 7)} in ${owner}/${repo}`);

  try {
    await postCommitAnalysisComment({
      installationId,
      owner,
      repo,
      commitSha,
    });
    console.log(`Successfully posted analysis for commit ${commitSha.slice(0, 7)} in ${owner}/${repo}`);
  } catch (error) {
    console.error(`Failed to analyze commit ${commitSha.slice(0, 7)}:`, error);
  }
}

// Background handler for issue analysis
async function handleIssueAnalysis({
  installationId,
  owner,
  repo,
  issueNumber,
}: {
  installationId?: number;
  owner: string;
  repo: string;
  issueNumber: number;
}) {
  if (!installationId) {
    console.error('No installation ID provided for issue analysis');
    return;
  }

  // Check if analysis is enabled for this repo
  const isEnabled = await isAnalysisEnabled(installationId, owner, repo);
  if (!isEnabled) {
    console.log(`Issue analysis not enabled for ${owner}/${repo}`);
    return;
  }

  console.log(`Starting issue analysis for #${issueNumber} in ${owner}/${repo}`);

  try {
    await postIssueAnalysisComment({
      installationId,
      owner,
      repo,
      issueNumber,
    });
    console.log(`Successfully posted analysis for issue #${issueNumber} in ${owner}/${repo}`);
  } catch (error) {
    console.error(`Failed to analyze issue #${issueNumber}:`, error);
  }
}

// Event Handlers - only register if webhooks is available
if (webhooks) {
  webhooks.on('installation.created', async ({ payload }) => {
    console.log('New installation created:', payload.installation.id);
    
    try {
      // Check if account exists and get its type
      const account = payload.installation.account;
      if (!account) {
        console.error('No account found in installation payload');
        return;
      }

      const accountType = 'type' in account ? account.type : 'User';
      
      // Extract account details based on type
      const accountLogin = 'login' in account ? account.login : account.slug;
      const accountAvatarUrl = account.avatar_url;
      const accountName = 'name' in account ? account.name : accountLogin;
      
      await db.insert(githubAppInstallations).values({
        installationId: payload.installation.id,
        accountId: account.id,
        accountType,
        accountLogin,
        accountAvatarUrl,
        accountName,
        repositorySelection: payload.installation.repository_selection,
      });

      if (payload.repositories) {
        for (const repo of payload.repositories) {
          await db.insert(installationRepositories).values({
            installationId: payload.installation.id,
            repositoryId: repo.id,
            fullName: repo.full_name,
          });
        }
      }
      
      console.log(`Successfully recorded installation ${payload.installation.id}`);
    } catch (error) {
      console.error('Failed to record installation:', error);
    }
  });

  webhooks.on('installation.deleted', async ({ payload }) => {
    console.log('Installation deleted:', payload.installation.id);
    
    try {
      // First, delete all related repository records
      await db.delete(installationRepositories)
        .where(eq(installationRepositories.installationId, payload.installation.id));
      console.log(`Deleted repository records for installation ${payload.installation.id}`);
      
      // Then delete the installation record
      await db.delete(githubAppInstallations)
        .where(eq(githubAppInstallations.installationId, payload.installation.id));
      console.log(`Successfully deleted installation ${payload.installation.id}`);
    } catch (error) {
      console.error('Failed to delete installation:', error);
    }
  });

  webhooks.on('installation_repositories.added', async ({ payload }) => {
    console.log(`Repositories added to installation ${payload.installation.id}`);
    
    try {
      for (const repo of payload.repositories_added) {
        await db.insert(installationRepositories).values({
          installationId: payload.installation.id,
          repositoryId: repo.id,
          fullName: repo.full_name,
        });
      }
      console.log(`Successfully added ${payload.repositories_added.length} repositories`);
    } catch (error) {
      console.error('Failed to add repositories:', error);
    }
  });

  webhooks.on('installation_repositories.removed', async ({ payload }) => {
    console.log(`Repositories removed from installation ${payload.installation.id}`);
    
    try {
      for (const repo of payload.repositories_removed) {
        await db.delete(installationRepositories)
          .where(and(
            eq(installationRepositories.installationId, payload.installation.id),
            eq(installationRepositories.repositoryId, repo.id)
          ));
      }
      console.log(`Successfully removed ${payload.repositories_removed.length} repositories`);
    } catch (error) {
      console.error('Failed to remove repositories:', error);
    }
  });

  webhooks.on('push', async ({ payload }) => {
    console.log(`Push event for ${payload.repository.full_name} with ${payload.commits.length} commits`);

    if (!payload.repository.owner) {
      console.error('No owner found in push event');
      return;
    }

    // Analyze each commit (limit to last 3 to avoid overwhelming API)
    const commitsToAnalyze = payload.commits.slice(-3);

    for (const commit of commitsToAnalyze) {
      handleCommitAnalysis({
        installationId: payload.installation?.id,
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        commitSha: commit.id,
      }).catch(error => {
        console.error(`Failed to analyze commit ${commit.id.slice(0, 7)}:`, error);
      });
    }
  });

  webhooks.on('pull_request.opened', async ({ payload }) => {
    console.log(`PR opened: ${payload.pull_request.title} in ${payload.repository.full_name}`);

    // Trigger PR analysis in the background
    handlePRAnalysis({
      installationId: payload.installation?.id,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      prNumber: payload.pull_request.number,
      prTitle: payload.pull_request.title,
      prDescription: payload.pull_request.body || '',
      baseBranch: payload.pull_request.base.ref,
      headBranch: payload.pull_request.head.ref,
    }).catch(error => {
      console.error('Failed to analyze PR:', error);
    });
  });

  webhooks.on('pull_request.synchronize', async ({ payload }) => {
    console.log(`PR updated: ${payload.pull_request.title} in ${payload.repository.full_name}`);

    // Re-run analysis when PR is updated
    handlePRAnalysis({
      installationId: payload.installation?.id,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      prNumber: payload.pull_request.number,
      prTitle: payload.pull_request.title,
      prDescription: payload.pull_request.body || '',
      baseBranch: payload.pull_request.base.ref,
      headBranch: payload.pull_request.head.ref,
    }).catch(error => {
      console.error('Failed to re-analyze PR:', error);
    });
  });

  webhooks.on('issues.opened', async ({ payload }) => {
    console.log(`Issue opened: #${payload.issue.number} - ${payload.issue.title} in ${payload.repository.full_name}`);

    // Trigger issue analysis in the background
    handleIssueAnalysis({
      installationId: payload.installation?.id,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issueNumber: payload.issue.number,
    }).catch(error => {
      console.error('Failed to analyze issue:', error);
    });
  });
}

// The main handler
export async function POST(request: Request) {
  if (!webhooks) {
    console.log('GitHub webhooks not configured - skipping webhook processing');
    return new Response('Webhooks not configured', { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!signature) {
    console.error('No signature found in webhook request');
    return new Response('No signature found', { status: 401 });
  }

  try {
    const verified = await webhooks.verify(payload, signature);
    if (!verified) {
      console.error('Webhook signature verification failed');
      return new Response('Signature verification failed', { status: 401 });
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    return new Response('Signature verification failed', { status: 401 });
  }

  const event = request.headers.get('x-github-event') ?? '';
  const delivery = request.headers.get('x-github-delivery') ?? '';

  try {
    await webhooks.receive({
      id: delivery,
      name: event as string,
      payload: JSON.parse(payload),
    } as Parameters<typeof webhooks.receive>[0]);

    console.log(`Successfully processed webhook event: ${event}`);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 