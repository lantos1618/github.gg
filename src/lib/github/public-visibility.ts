import { getAccessibleRepositoryInfo } from './repository-access';

export type RepositoryName = { owner: string; name: string };

const BATCH_SIZE = 50;
const FALLBACK_LIMIT = 30;

/** Verify current public visibility for sitemap entries without serving content. */
export async function getCurrentlyPublicRepositoryKeys(
  repositories: RepositoryName[],
  token = process.env.GITHUB_PUBLIC_API_KEY,
  request: typeof fetch = fetch
): Promise<Set<string>> {
  const publicKeys = new Set<string>();
  const unique = [...new Map(repositories.map((repository) => [
    `${repository.owner.toLowerCase()}/${repository.name.toLowerCase()}`,
    repository,
  ])).entries()];

  if (!token) {
    // An anonymous REST check is rate-limited; keep a useful partial sitemap
    // while treating every unchecked repository as private.
    await Promise.all(unique.slice(0, FALLBACK_LIMIT).map(async ([key, repository]) => {
      const info = await getAccessibleRepositoryInfo(repository.owner, repository.name, null);
      if (info && !info.private) publicKeys.add(key);
    }));
    return publicKeys;
  }

  const batches = Array.from({ length: Math.ceil(unique.length / BATCH_SIZE) }, (_, index) =>
    unique.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE)
  );
  let nextBatch = 0;
  await Promise.all(Array.from({ length: Math.min(4, batches.length) }, async () => {
    while (nextBatch < batches.length) {
      const batch = batches[nextBatch++];
      const query = `query PublicRepositoryVisibility {\n${batch.map(([, repository], index) =>
        `  r${index}: repository(owner: ${JSON.stringify(repository.owner)}, name: ${JSON.stringify(repository.name)}) { isPrivate }`
      ).join('\n')}\n}`;

      try {
        const response = await request('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
          cache: 'no-store',
        });
        if (!response.ok) continue;
        const result = await response.json() as {
          data?: Record<string, { isPrivate?: boolean } | null>;
        };
        batch.forEach(([key], index) => {
          if (result.data?.[`r${index}`]?.isPrivate === false) publicKeys.add(key);
        });
      } catch {
        // Unknown visibility is never published.
      }
    }
  }));

  return publicKeys;
}
