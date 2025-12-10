'use client';

import { useCallback } from 'react';
import { useAuth } from '@/lib/auth/client';
import { TRPCClientErrorLike } from '@trpc/client';
import type { AppRouter } from '@/lib/trpc/routes';

/**
 * Checks if an error is a GitHub authentication error (expired/invalid token)
 */
export function isGitHubAuthError(error: unknown): boolean {
  if (!error) return false;

  // Check for tRPC error with UNAUTHORIZED code
  const trpcError = error as TRPCClientErrorLike<AppRouter>;
  if (trpcError?.data?.code === 'UNAUTHORIZED') {
    return true;
  }

  // Check error message for auth-related keywords
  const message = (error as Error)?.message?.toLowerCase() || '';
  if (
    message.includes('bad credentials') ||
    message.includes('token expired') ||
    message.includes('authentication failed') ||
    message.includes('401')
  ) {
    return true;
  }

  return false;
}

/**
 * Hook that provides a function to handle GitHub auth errors by prompting re-signin
 */
export function useGitHubAuthError() {
  const { signIn, isSignedIn } = useAuth();

  const handleAuthError = useCallback(
    async (error: unknown): Promise<boolean> => {
      if (!isGitHubAuthError(error)) {
        return false;
      }

      // If user is signed in but got auth error, their token is expired/invalid
      // Trigger re-authentication
      if (isSignedIn) {
        // Store current URL to return after re-auth
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';
        await signIn(currentUrl);
        return true;
      }

      return false;
    },
    [signIn, isSignedIn]
  );

  return {
    isGitHubAuthError,
    handleAuthError,
  };
}
