/**
 * `installation` event handlers — created + deleted.
 *
 * These run in the worker (NOT the request path) so DB inserts are no longer
 * bounded by the 30s serverless cap.
 */
import type {
  InstallationCreatedEvent,
  InstallationDeletedEvent,
} from '@octokit/webhooks-types';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { githubAppInstallations, installationRepositories } from '@/db/schema';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WebhookHandler:installation');

export async function handleInstallationCreated(payload: unknown): Promise<void> {
  const event = payload as InstallationCreatedEvent;
  const installationId = event.installation.id;
  logger.info('Installation created', { installationId });

  const account = event.installation.account;
  if (!account) {
    // We deliberately don't throw here — there's nothing a retry can recover
    // from when the payload itself is malformed. Log and acknowledge.
    logger.error('No account found in installation payload', undefined, {
      installationId,
    });
    return;
  }

  // The webhook-types `Installation.account` is typed as User, which carries
  // login/type/name/avatar_url. GitHub's runtime payloads can also include an
  // Enterprise account (with `slug` instead of `login`) — we defensively fall
  // back via `in` checks to match the old route behavior.
  const accountAny = account as unknown as Record<string, unknown>;
  const accountType =
    typeof accountAny.type === 'string' ? (accountAny.type as string) : 'User';
  const accountLogin =
    typeof accountAny.login === 'string'
      ? (accountAny.login as string)
      : typeof accountAny.slug === 'string'
        ? (accountAny.slug as string)
        : 'unknown';
  const accountAvatarUrl =
    typeof accountAny.avatar_url === 'string' ? (accountAny.avatar_url as string) : '';
  const accountName =
    typeof accountAny.name === 'string' ? (accountAny.name as string) : accountLogin;

  logger.info('Recording installation', {
    installationId,
    accountLogin,
    accountType,
    repositoryCount: event.repositories?.length || 0,
  });

  // GitHub retries deliveries and BullMQ retries failed jobs. Keep the
  // installation and its initial repository list in one transaction so a
  // failed repository insert cannot leave an installation that blocks retry.
  await db.transaction(async (tx) => {
    await tx.insert(githubAppInstallations).values({
      installationId,
      accountId: account.id,
      accountType,
      accountLogin,
      accountAvatarUrl,
      accountName,
      repositorySelection: event.installation.repository_selection,
    }).onConflictDoUpdate({
      target: githubAppInstallations.installationId,
      set: {
        accountId: account.id,
        accountType,
        accountLogin,
        accountAvatarUrl,
        accountName,
        repositorySelection: event.installation.repository_selection,
        updatedAt: new Date(),
      },
    });

    if (event.repositories && event.repositories.length > 0) {
      await tx.insert(installationRepositories).values(
        event.repositories.map((repo) => ({
          installationId,
          repositoryId: repo.id,
          fullName: repo.full_name,
        })),
      ).onConflictDoNothing({
        target: [installationRepositories.installationId, installationRepositories.repositoryId],
      });
    }
  });

  logger.info('Successfully recorded installation', {
    installationId,
    accountLogin,
    repositoryCount: event.repositories?.length || 0,
  });
}

export async function handleInstallationDeleted(payload: unknown): Promise<void> {
  const event = payload as InstallationDeletedEvent;
  const installationId = event.installation.id;
  logger.info('Installation deleted', { installationId });

  // Delete repository records first to keep FK integrity.
  await db
    .delete(installationRepositories)
    .where(eq(installationRepositories.installationId, installationId));
  logger.info('Deleted repository records', { installationId });

  await db
    .delete(githubAppInstallations)
    .where(eq(githubAppInstallations.installationId, installationId));
  logger.info('Successfully deleted installation', { installationId });
}
