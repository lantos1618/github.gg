import type { BetterAuthSession } from '@/lib/github/types';

export async function checkRepositoryWriteAccess(
  session: BetterAuthSession | null,
  owner: string,
  repo: string
): Promise<boolean> {
  const { createGitHubServiceForUserOperations } = await import('@/lib/github');
  const githubService = await createGitHubServiceForUserOperations(session);

  try {
    const { data: repoData } = await githubService['octokit'].repos.get({
      owner,
      repo,
    });

    return !!(repoData.permissions?.admin || repoData.permissions?.push);
  } catch {
    return false;
  }
}
