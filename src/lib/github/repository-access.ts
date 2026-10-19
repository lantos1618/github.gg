import type { BetterAuthSession, RepositoryInfo } from './types';

type RepositoryServiceFactory = (
  owner: string,
  repo: string,
  session: BetterAuthSession | null
) => Promise<{ getRepositoryInfo(owner: string, repo: string): Promise<RepositoryInfo> }>;

const createRepositoryService: RepositoryServiceFactory = async (owner, repo, session) =>
  (await import('./index')).createGitHubServiceForRepo(owner, repo, session);

/**
 * Resolve a repository's current visibility using credentials scoped to the
 * caller. A cached artifact must never establish its own public visibility:
 * repositories can become private after an artifact was generated.
 *
 * A null result means access could not be established, including GitHub API
 * errors. Callers must not serve cached repository content in that case.
 */
export async function getAccessibleRepositoryInfo(
  owner: string,
  repo: string,
  session: BetterAuthSession | null,
  serviceFactory: RepositoryServiceFactory = createRepositoryService
): Promise<RepositoryInfo | null> {
  try {
    const service = await serviceFactory(owner, repo, session);
    const info = await service.getRepositoryInfo(owner, repo);
    if (info.private && !session?.user?.id) return null;
    return info;
  } catch (error) {
    console.warn(`[repository-access ${owner}/${repo}] access check failed:`, error);
    return null;
  }
}
