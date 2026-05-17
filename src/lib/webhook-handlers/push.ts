/**
 * `push` event handler — runs commit analysis in the worker.
 */
import type { PushEvent } from '@octokit/webhooks-types';
import {
  postCommitAnalysisComment,
  isAnalysisEnabled,
} from '@/lib/github/commit-issue-comment-service';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WebhookHandler:push');

export async function handlePushEvent(payload: unknown): Promise<void> {
  const event = payload as PushEvent;
  const repo = event.repository.full_name;
  const commitCount = event.commits.length;
  logger.info('Push event', { repo, commitCount });

  if (!event.repository.owner) {
    logger.error('No owner found in push event', undefined, {
      repo,
      hasRepository: !!event.repository,
    });
    return;
  }

  const installationId = event.installation?.id;
  if (!installationId) {
    logger.debug('No installation ID on push event, skipping analysis', { repo });
    return;
  }

  // Last 3 commits only — analyzing the full set on a force-push or rebase
  // would burn tokens for diminishing value.
  const commitsToAnalyze = event.commits.slice(-3);
  logger.info('Analyzing commits', {
    repo,
    totalCommits: commitCount,
    analyzingCount: commitsToAnalyze.length,
  });

  // Bail early if analysis isn't enabled for this repo — saves a round trip per commit.
  const enabled = await isAnalysisEnabled(
    installationId,
    event.repository.owner.login,
    event.repository.name,
  );
  if (!enabled) {
    logger.debug('Analysis not enabled, skipping', { repo });
    return;
  }

  // Run commits sequentially — parallel analysis would spike the AI rate
  // limiter and the underlying installation token quota. The worker has 60s
  // per job, which is plenty for 3 commits.
  const errors: Error[] = [];
  for (const commit of commitsToAnalyze) {
    try {
      await postCommitAnalysisComment({
        installationId,
        owner: event.repository.owner.login,
        repo: event.repository.name,
        commitSha: commit.id,
      });
    } catch (err) {
      logger.error('Commit analysis failed', err, {
        repo,
        commitSha: commit.id.slice(0, 7),
      });
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // Surface the first error so BullMQ can retry. If only some commits failed
  // we'll re-analyze all of them on retry — postCommitAnalysisComment is
  // idempotent (it checks for an existing comment), so this is safe.
  if (errors.length > 0) {
    throw errors[0];
  }
}
