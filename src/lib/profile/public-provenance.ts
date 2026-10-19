import { getCurrentlyPublicRepositoryKeys, type RepositoryName } from '@/lib/github/public-visibility';

type ProfileWithData = { profileData: unknown };

function sourceRepositories(profileData: unknown): RepositoryName[] | null {
  if (!profileData || typeof profileData !== 'object') return null;
  const data = profileData as Record<string, unknown>;
  if (data.visibilityVerified !== true || !Array.isArray(data.publicSourceRepos) || data.publicSourceRepos.length === 0) return null;
  if (data.publicSourceRepos.length > 30) return null;

  const repositories: RepositoryName[] = [];
  for (const value of data.publicSourceRepos) {
    if (!value || typeof value !== 'object') return null;
    const repo = value as Record<string, unknown>;
    if (typeof repo.owner !== 'string' || typeof repo.name !== 'string' ||
        !/^[A-Za-z0-9-]{1,39}$/.test(repo.owner) || !/^[A-Za-z0-9._-]{1,100}$/.test(repo.name)) return null;
    repositories.push({ owner: repo.owner, name: repo.name });
  }
  return repositories;
}

export function withVerifiedPublicSources<T extends object>(
  profile: T,
  repositories: RepositoryName[]
): T & { visibilityVerified: true; publicSourceRepos: RepositoryName[] } {
  return { ...profile, visibilityVerified: true, publicSourceRepos: repositories };
}

export async function filterCurrentlyPublicProfiles<T extends ProfileWithData>(
  profiles: T[],
  getPublicKeys: (repositories: RepositoryName[]) => Promise<Set<string>> = getCurrentlyPublicRepositoryKeys
): Promise<T[]> {
  const sources = profiles.map(profile => sourceRepositories(profile.profileData));
  const allRepositories = sources.flatMap(repositories => repositories ?? []);
  if (allRepositories.length === 0) return [];
  const publicKeys = await getPublicKeys(allRepositories);
  return profiles.filter((_, index) => sources[index]?.every(repo =>
    publicKeys.has(`${repo.owner.toLowerCase()}/${repo.name.toLowerCase()}`)
  ) === true);
}

export async function areRepositoriesCurrentlyPublic(
  repositories: RepositoryName[],
  getPublicKeys: (repositories: RepositoryName[]) => Promise<Set<string>> = getCurrentlyPublicRepositoryKeys
): Promise<boolean> {
  if (repositories.length === 0 || repositories.length > 30) return false;
  const publicKeys = await getPublicKeys(repositories);
  return repositories.every(repo => publicKeys.has(`${repo.owner.toLowerCase()}/${repo.name.toLowerCase()}`));
}
