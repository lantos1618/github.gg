/**
 * `issues.opened` handler.
 */
import type { IssuesOpenedEvent } from '@octokit/webhooks-types';
import {
  postIssueAnalysisComment,
  isAnalysisEnabled,
} from '@/lib/github/commit-issue-comment-service';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WebhookHandler:issues');

export async function handleIssueOpenedEvent(payload: unknown): Promise<void> {
  const event = payload as IssuesOpenedEvent;
  const repo = event.repository.full_name;
  const issueNumber = event.issue.number;
  const issueTitle = event.issue.title;
  logger.info('Issue opened', { repo, issueNumber, issueTitle });

  const installationId = event.installation?.id;
  if (!installationId) {
    logger.debug('No installation ID on issue event, skipping analysis', { repo, issueNumber });
    return;
  }

  const owner = event.repository.owner.login;
  const repoName = event.repository.name;

  const enabled = await isAnalysisEnabled(installationId, owner, repoName);
  if (!enabled) {
    logger.debug('Issue analysis not enabled, skipping', { repo, issueNumber });
    return;
  }

  await postIssueAnalysisComment({
    installationId,
    owner,
    repo: repoName,
    issueNumber,
  });

  logger.info('SUCCESS: Issue analysis completed', { repo, issueNumber });
}
