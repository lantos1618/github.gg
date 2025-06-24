import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export type RepoTab = {
  key: string;
  label: string;
  url?: (user: string, repo: string, ref?: string, path?: string) => string;
  onClick?: (user: string, repo: string, router: AppRouterInstance, ref?: string, path?: string) => void;
};

export function buildRepoUrl({
  user,
  repo,
  ref,
  path,
  suffix = '',
}: {
  user: string;
  repo: string;
  ref?: string;
  path?: string;
  suffix?: string;
}) {
  if (!ref) {
    return `/${user}/${repo}${suffix}`;
  }
  if (!path) {
    return `/${user}/${repo}/tree/${ref}${suffix}`;
  }
  return `/${user}/${repo}/tree/${ref}/${path}${suffix}`;
}

export const REPO_TABS: RepoTab[] = [
  {
    key: 'wiki',
    label: 'Wiki',
    url: (user, repo, ref, path) => buildRepoUrl({ user, repo, ref, path }),
  },
  {
    key: 'insights',
    label: 'Insights',
    url: (user, repo, ref, path) => buildRepoUrl({ user, repo, ref, path, suffix: '/insights' }),
  },
  {
    key: 'diagram',
    label: 'Diagram',
    onClick: (user, repo, router, ref, path) => {
      router.push(buildRepoUrl({ user, repo, ref, path, suffix: '/diagram' }));
    },
  },
]; 