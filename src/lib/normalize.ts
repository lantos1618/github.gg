/**
 * Canonical normalization helpers for GitHub usernames and repo identifiers.
 *
 * GitHub treats usernames and repo names case-insensitively, but the database
 * stores whatever was originally supplied. Every cache lookup / write path
 * in this app must lowercase identifiers before comparing or inserting so
 * `Torvalds/Linux` and `torvalds/linux` resolve to the same row.
 *
 * Use these helpers instead of ad-hoc `.toLowerCase()` calls — they centralize
 * the convention and make intent obvious at the call site.
 */

export function normalizeUsername(s: string): string {
  return s.toLowerCase();
}

export interface RepoIdent {
  owner: string;
  repo: string;
}

export function normalizeRepoIdent({ owner, repo }: RepoIdent): RepoIdent {
  return {
    owner: owner.toLowerCase(),
    repo: repo.toLowerCase(),
  };
}
