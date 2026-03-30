'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth/client';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  please_restart_the_process: {
    title: 'Sign-in Expired',
    description:
      'Your sign-in session expired or was interrupted. This can happen if you took too long on the GitHub authorization page or opened multiple sign-in tabs.',
  },
  state_mismatch: {
    title: 'State Mismatch',
    description:
      'The sign-in request could not be verified. This usually happens when browser cookies are blocked or you opened multiple sign-in tabs.',
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
  const errorCode = searchParams.get('error') || 'unknown';
  const { title, description } = ERROR_MESSAGES[errorCode] || DEFAULT_ERROR;
  const { signIn } = useAuth();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="w-[90%] max-w-[500px]">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
          Authentication
        </div>
        <h1 className="text-[26px] font-semibold text-[#111] mb-2">{title}</h1>
        <p className="text-[14px] text-[#666] leading-[1.6] mb-6">{description}</p>
        {errorCode !== 'unknown' && (
          <p className="text-[12px] text-[#aaa] font-mono mb-6">
            Code: {errorCode}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => signIn('/')}
            className="px-4 py-2 bg-[#111] text-white text-[14px] font-medium rounded-md hover:bg-[#333] transition-colors"
          >
            Sign in again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-[#f8f9fa] text-[#333] text-[14px] font-medium rounded-md border border-[#ddd] hover:border-[#aaa] transition-colors"
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
            <h1 className="text-[26px] font-semibold text-[#111] mb-2">Authentication Error</h1>
            <p className="text-[14px] text-[#666]">Loading error details...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
