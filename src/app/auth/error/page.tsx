'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth/client';

const COOKIE_HINT =
  'Most often a stale or blocked OAuth cookie. Clear cookies for github.gg in this browser, then sign in again. If you use a content blocker or strict tracking-protection mode, allow github.com OAuth redirects.';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  please_restart_the_process: {
    title: 'Sign-in Expired',
    description:
      'Your sign-in session expired or was interrupted. This can happen if you took too long on the GitHub authorization page or opened multiple sign-in tabs.',
  },
  state_mismatch: {
    title: 'State Mismatch',
    description: `The sign-in request could not be verified. ${COOKIE_HINT}`,
  },
  state_not_found: {
    title: 'Sign-in State Missing',
    description: `GitHub redirected back without the verification token. ${COOKIE_HINT}`,
  },
  invalid_callback_request: {
    title: 'Invalid Callback',
    description: `The OAuth callback from GitHub was malformed. ${COOKIE_HINT}`,
  },
  no_code: {
    title: 'Missing Authorization Code',
    description:
      'GitHub did not return an authorization code. Try signing in again — if it persists, the GitHub OAuth app may be misconfigured.',
  },
  invalid_code: {
    title: 'Invalid Authorization Code',
    description:
      'GitHub rejected the authorization code (it may have already been used or expired). Please try signing in again.',
  },
  access_denied: {
    title: 'Access Denied',
    description:
      'You declined access on the GitHub authorization page. To use github.gg, GitHub permissions are required.',
  },
  unable_to_get_user_info: {
    title: 'Could Not Read GitHub Profile',
    description:
      'We could not fetch your profile from GitHub after sign-in. This is usually transient — please try again.',
  },
  email_not_found: {
    title: 'No Email From GitHub',
    description:
      'GitHub did not return a verified email for your account. Add a verified email to your GitHub account and try again.',
  },
  oauth_provider_not_found: {
    title: 'OAuth Provider Misconfigured',
    description:
      'The server could not find the GitHub OAuth provider. This is a server-side issue.',
  },
  banned: {
    title: 'Account Restricted',
    description:
      'This account is restricted from signing in. Contact support if you believe this is a mistake.',
  },
  internal_server_error: {
    title: 'Server Error',
    description:
      'Something went wrong on our end while signing you in. Please try again in a moment.',
  },
};

const DEFAULT_ERROR = {
  title: 'Authentication Error',
  description: 'Something went wrong during sign-in. Please try again.',
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  // Better Auth uses ?error=<code> for most failures, but ?state=state_not_found
  // for the missing-state case. Fall back to that so the page is informative.
  const errorCode =
    searchParams.get('error') ||
    (searchParams.get('state') === 'state_not_found' ? 'state_not_found' : '') ||
    'unknown';
  const errorDescription = searchParams.get('error_description');
  const { title, description } = ERROR_MESSAGES[errorCode] || DEFAULT_ERROR;
  const { signIn } = useAuth();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="w-[90%] max-w-[500px]">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
          Authentication
        </div>
        <h1 className="text-[25px] font-semibold text-[#111] mb-2">{title}</h1>
        <p className="text-base text-[#666] leading-[1.6] mb-6">{description}</p>
        {errorDescription && (
          <p className="text-sm text-[#666] leading-[1.6] mb-4 italic">
            “{errorDescription}”
          </p>
        )}
        {errorCode !== 'unknown' && (
          <p className="text-[13px] text-[#aaa] font-mono mb-6">
            Code: {errorCode}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => signIn('/')}
            className="px-4 py-2 bg-[#111] text-white text-base font-medium rounded-md hover:bg-[#333] transition-colors"
          >
            Sign in again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-[#f8f9fa] text-[#333] text-base font-medium rounded-md border border-[#ddd] hover:border-[#aaa] transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
          <div className="w-[90%] max-w-[500px]">
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
              Authentication
            </div>
            <h1 className="text-[25px] font-semibold text-[#111] mb-2">Authentication Error</h1>
            <p className="text-base text-[#666]">Loading error details...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
