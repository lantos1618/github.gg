'use client';

import { useSessionHint } from '@/lib/session-context';
import { useAuth } from '@/lib/auth/client';
import { Github } from 'lucide-react';
import { buildGitHubAppInstallUrl } from '@/lib/github/install-url';

interface RepoStatusProps {
  error?: { message: string } | null;
  owner?: string;
  repo?: string;
}

export function RepoStatus({ error, owner, repo }: RepoStatusProps) {
  const session = useSessionHint();
  const { signIn } = useAuth();
  const isSignedIn = !!session?.userId;

  if (!error) return null;

  const msg = error.message || '';
  const isRateLimit = msg.includes('rate limit') || msg.includes('429');
  const isUnauthorized = !isRateLimit && (msg.includes('unauthorized') || msg.includes('401') || msg.includes('Bad credentials'));
  const isNotFound = !isRateLimit && !isUnauthorized && (msg.includes('not found') || msg.includes('404'));

  // Default to "likely private repo we can't see" framing on NOT_FOUND.
  // Lead with install CTA. "Doesn't exist" is the fine-print fallback.
  const isProbablyPrivate = isNotFound;

  const returnPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined;
  const installUrl = buildGitHubAppInstallUrl(returnPath);

  const repoLabel = owner && repo ? `${owner}/${repo}` : owner ? owner : 'this repository';

  const accent = isRateLimit ? '#f59e0b' : isUnauthorized ? '#f59e0b' : isProbablyPrivate ? '#2563eb' : '#ea4335';

  let title: string;
  let body: React.ReactNode;
  let primary: React.ReactNode = null;
  let secondary: React.ReactNode = null;

  if (isProbablyPrivate) {
    title = "Can't see this repo";
    body = (
      <>
        If <span className="font-mono">{repoLabel}</span> is private, github.gg needs the GitHub App installed on{' '}
        <span className="font-mono">{owner || 'the owner'}</span> to fetch it.
      </>
    );
    primary = (
      <a
        href={installUrl}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111] hover:bg-[#333] rounded transition-colors"
      >
        <Github className="h-4 w-4" />
        Install GitHub App{owner ? ` on ${owner}` : ''}
      </a>
    );
    if (!isSignedIn) {
      secondary = (
        <button
          onClick={() => signIn(returnPath)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#111] bg-white border border-[#ddd] hover:bg-[#f5f5f5] rounded transition-colors"
        >
          Sign in with GitHub
        </button>
      );
    }
  } else if (isUnauthorized) {
    title = 'Access denied';
    body = (
      <>
        Your GitHub session isn&apos;t authorized for <span className="font-mono">{repoLabel}</span>. Try signing in again, or install the GitHub App on the owner.
      </>
    );
    primary = (
      <button
        onClick={() => signIn(returnPath)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111] hover:bg-[#333] rounded transition-colors"
      >
        <Github className="h-4 w-4" />
        Sign in again
      </button>
    );
    secondary = (
      <a
        href={installUrl}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#111] bg-white border border-[#ddd] hover:bg-[#f5f5f5] rounded transition-colors"
      >
        Install GitHub App
      </a>
    );
  } else if (isRateLimit) {
    title = 'GitHub rate limit hit';
    body = (
      <>
        GitHub&apos;s API is temporarily throttled for this request. {isSignedIn ? 'Try again in a minute, or install the GitHub App for higher limits.' : 'Sign in for higher rate limits.'}
      </>
    );
    primary = isSignedIn ? (
      <a
        href={installUrl}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111] hover:bg-[#333] rounded transition-colors"
      >
        Install GitHub App
      </a>
    ) : (
      <button
        onClick={() => signIn(returnPath)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111] hover:bg-[#333] rounded transition-colors"
      >
        <Github className="h-4 w-4" />
        Sign in with GitHub
      </button>
    );
  } else {
    title = 'Error loading repository';
    body = <>{msg}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-[90%] max-w-[560px]">
        <div className="bg-[#f8f9fa] py-[18px] px-[20px]" style={{ borderLeft: `3px solid ${accent}` }}>
          <div className="text-[13px] font-semibold uppercase tracking-[1px] mb-1" style={{ color: accent }}>
            {title}
          </div>
          <div className="text-base text-[#333] leading-[1.6] mb-4">{body}</div>

          {(primary || secondary) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {primary}
              {secondary}
            </div>
          )}

          {isProbablyPrivate && isSignedIn && (
            <div className="text-[12px] text-[#666] mb-3">
              On GitHub&apos;s next screen, pick <span className="font-semibold">Only select repositories</span> to grant access to just this one.
            </div>
          )}

          {isProbablyPrivate && (
            <div className="text-[12px] text-[#888] italic">
              Or the repo may not exist. Try a public one like{' '}
              <a href="/lantos1618/github.gg" className="underline hover:text-[#555]">
                lantos1618/github.gg
              </a>
              .
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
