/**
 * `installation_repositories` event handlers — added + removed.
 *
 * The added handler is the second of the two big timeout offenders: orgs with
 * hundreds of repos blow past the 30s cap on a single `INSERT ... VALUES`.
 * Running in the worker gives us 60s + retries to recover.
 */
import type {
  InstallationRepositoriesAddedEvent,
  InstallationRepositoriesRemovedEvent,
} from '@octokit/webhooks-types';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { installationRepositories } from '@/db/schema';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WebhookHandler:installation_repositories');

export async function handleInstallationRepositoriesAdded(
  payload: unknown,
): Promise<void> {
  const event = payload as InstallationRepositoriesAddedEvent;
  const installationId = event.installation.id;
  const count = event.repositories_added.length;
  logger.info('Installation repositories added', { installationId, count });

  if (event.repositories_added.length > 0) {
    await db.insert(installationRepositories).values(
      event.repositories_added.map((repo) => ({
        installationId: event.installation.id,
        repositoryId: repo.id,
        fullName: repo.full_name,
      })),
    );
  }
  logger.info('Successfully added repositories', { installationId, count });
}

export async function handleInstallationRepositoriesRemoved(
  payload: unknown,
): Promise<void> {
  const event = payload as InstallationRepositoriesRemovedEvent;
  const installationId = event.installation.id;
  const count = event.repositories_removed.length;
  logger.info('Installation repositories removed', { installationId, count });

  if (event.repositories_removed.length > 0) {
    const repoIds = event.repositories_removed.map((repo) => repo.id);
    await db
      .delete(installationRepositories)
      .where(
        and(
          eq(installationRepositories.installationId, event.installation.id),
          inArray(installationRepositories.repositoryId, repoIds),
        ),
      );
  }
  logger.info('Successfully removed repositories', { installationId, count });
}
