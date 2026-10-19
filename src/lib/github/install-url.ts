import { safeLocalPath } from '@/lib/utils/safe-local-path';

const APP_NAME = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'gh-gg';

export function buildGitHubAppInstallUrl(returnPath?: string | null): string {
  const base = `https://github.com/apps/${APP_NAME}/installations/new`;
  if (!returnPath) return base;
  const safe = safeLocalPath(returnPath);
  return safe ? `${base}?state=${encodeURIComponent(safe)}` : base;
}
