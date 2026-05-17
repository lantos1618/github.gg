/**
 * `pull_request` event handler — opened + synchronize.
 */
import type { PullRequestOpenedEvent } from '@octokit/webhooks-types';
import {
  postPRReviewComment,
  isPRReviewEnabled,
} from '@/lib/github/pr-comment-service';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WebhookHandler:pull_request');

export async function handlePullRequestEvent(
  payload: unknown,
  action: 'opened' | 'synchronize',
): Promise<void> {
  // PullRequestOpenedEvent and PullRequestSynchronizeEvent share the same
  // shape for the fields we use — typing as PullRequestOpenedEvent is fine.
  const event = payload as PullRequestOpenedEvent;
  const repo = event.repository.full_name;
  const prNumber = event.pull_request.number;
  const prTitle = event.pull_request.title;
  logger.info('Pull request event', { repo, prNumber, prTitle, action });

  const installationId = event.installation?.id;
  if (!installationId) {
    logger.debug('No installation ID on PR event, skipping analysis', { repo, prNumber });
    return;
  }

  const owner = event.repository.owner.login;
  const repoName = event.repository.name;

  const enabled = await isPRReviewEnabled(installationId, owner, repoName);
  if (!enabled) {
    logger.debug('PR review not enabled, skipping', { repo, prNumber });
    return;
  }

  await postPRReviewComment({
    installationId,
    owner,
    repo: repoName,
    prNumber,
    prTitle,
    prDescription: event.pull_request.body || '',
    baseBranch: event.pull_request.base.ref,
    headBranch: event.pull_request.head.ref,
  });

  logger.info('SUCCESS: PR analysis completed', { repo, prNumber });
}
