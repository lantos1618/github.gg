/**
 * Webhook event dispatcher.
 *
 * Lives behind the queue: the BullMQ worker calls `dispatchWebhookEvent` with
 * the event name + parsed payload. We keep the per-event handlers in this
 * folder (one file each) so they can be tested + evolved without touching the
 * HTTP route.
 *
 * Note on retries: each handler is expected to throw on failure so BullMQ can
 * retry. They should NOT swallow errors internally the way the old in-request
 * handlers did — that pattern existed because we couldn't surface failures to
 * GitHub anyway. Now we can retry.
 */
import { createLogger } from '@/lib/logging';
import { handleInstallationCreated, handleInstallationDeleted } from './installation';
import {
  handleInstallationRepositoriesAdded,
  handleInstallationRepositoriesRemoved,
} from './installation-repositories';
import { handlePushEvent } from './push';
import { handlePullRequestEvent } from './pull-request';
import { handleIssueOpenedEvent } from './issues';

const logger = createLogger('WebhookDispatcher');

export interface DispatchContext {
  deliveryId: string;
  eventName: string;
  payload: unknown;
}

/**
 * Dispatch a webhook event to the correct handler.
 *
 * The `eventName` from GitHub does NOT include the action — that lives on
 * `payload.action`. We match on `event` first, then narrow by action where
 * relevant. This mirrors `@octokit/webhooks`' dispatch semantics without
 * pulling in the listener/receive machinery (which is what made the request
 * path slow in the first place).
 */
export async function dispatchWebhookEvent(ctx: DispatchContext): Promise<void> {
  const { eventName, payload } = ctx;
  // We cast to `Record<string, unknown>` only for the action lookup; the
  // handlers themselves narrow with their own type guards.
  const action = (payload as { action?: string } | null)?.action;

  logger.info('Dispatching webhook event', {
    deliveryId: ctx.deliveryId,
    eventName,
    action,
  });

  switch (eventName) {
    case 'installation': {
      if (action === 'created') {
        await handleInstallationCreated(payload);
      } else if (action === 'deleted') {
        await handleInstallationDeleted(payload);
      } else {
        logger.debug('Ignoring installation action', { action });
      }
      return;
    }
    case 'installation_repositories': {
      if (action === 'added') {
        await handleInstallationRepositoriesAdded(payload);
      } else if (action === 'removed') {
        await handleInstallationRepositoriesRemoved(payload);
      } else {
        logger.debug('Ignoring installation_repositories action', { action });
      }
      return;
    }
    case 'push': {
      await handlePushEvent(payload);
      return;
    }
    case 'pull_request': {
      if (action === 'opened' || action === 'synchronize') {
        await handlePullRequestEvent(payload, action);
      } else {
        logger.debug('Ignoring pull_request action', { action });
      }
      return;
    }
    case 'issues': {
      if (action === 'opened') {
        await handleIssueOpenedEvent(payload);
      } else {
        logger.debug('Ignoring issues action', { action });
      }
      return;
    }
    default:
      logger.debug('No handler for event', { eventName, action });
  }
}
