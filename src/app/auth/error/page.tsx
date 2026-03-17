'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth/client';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  please_restart_the_process: {
    title: 'Sign-in Expired',
    description:
      'Your sign-in session expired or was interrupted. This can happen if you took too long on the GitHub authorization page or opened multiple sign-in tabs. Please try again.',
  },
  state_mismatch: {
    title: 'Sign-in State Mismatch',
    description:
      'The sign-in request could not be verified. This usually happens when browser cookies are blocked or you opened multiple sign-in tabs. Please try again.',
  },
  internal_server_error: {
    title: 'Server Error',
    description:
      'Something went wrong on our end while signing you in. Please try again in a moment.',
  },
};

const DEFAULT_ERROR = {
  title: 'Authentication Error',
  description:
    'Something went wrong during sign-in. Please try again.',
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error') || 'unknown';
  const { title, description } = ERROR_MESSAGES[errorCode] || DEFAULT_ERROR;
  const { signIn } = useAuth();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{description}</p>
        {errorCode !== 'unknown' && (
          <p className="text-xs text-gray-400 mb-4">
            Error code: {errorCode}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => signIn('/')}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sign in again
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
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
          <div className="text-center max-w-md px-4">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 mb-6">Loading error details...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
