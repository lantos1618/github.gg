'use client';

import { createAuthClient } from "better-auth/react";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../trpc/client';
import type { UnifiedSession, GitHubAppSession } from './index';

// Create Better Auth client
const { useSession, signIn, signOut } = createAuthClient({
  baseURL: typeof window !== 'undefined' 
    ? `${window.location.origin}/api/auth`
    : process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth`
      : "http://localhost:3000/api/auth"
});

// Unified authentication hook
export function useAuth() {
  const { data: betterAuthSession, isPending: isBetterAuthPending, error: betterAuthError } = useSession();
  const [githubAppSession, setGitHubAppSession] = useState<GitHubAppSession | null>(null);
  const [isGitHubAppLoading, setIsGitHubAppLoading] = useState(true);
  const [githubAppError, setGitHubAppError] = useState<string | null>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  // Check GitHub App session on mount
  useEffect(() => {
    checkGitHubAppSession();
  }, []);

  const checkGitHubAppSession = async () => {
    try {
      setIsGitHubAppLoading(true);
      const response = await fetch('/api/auth/github-app');
      
      if (response.ok) {
        const data = await response.json();
        setGitHubAppSession(data.session);
      } else {
        setGitHubAppSession(null);
      }
    } catch (err) {
      console.error('Failed to check GitHub App session:', err);
      setGitHubAppError('Failed to check authentication status');
      setGitHubAppSession(null);
    } finally {
      setIsGitHubAppLoading(false);
    }
  };

  // Unified session combining both auth types
  const unifiedSession: UnifiedSession = betterAuthSession?.user 
    ? {
        user: {
          id: betterAuthSession.user.id,
          name: betterAuthSession.user.name,
          email: betterAuthSession.user.email || undefined,
          image: betterAuthSession.user.image || undefined,
        },
        isSignedIn: true,
        authType: 'oauth',
      }
    : githubAppSession
    ? {
        user: {
          id: githubAppSession.userId,
          name: githubAppSession.name,
          email: githubAppSession.email,
          image: githubAppSession.image,
          login: githubAppSession.login,
          accountType: githubAppSession.accountType,
        },
        isSignedIn: true,
        authType: 'github-app',
        installationId: githubAppSession.installationId,
      }
    : {
        user: null,
        isSignedIn: false,
        authType: null,
      };

  const handleSignIn = async () => {
    await signIn.social({
      provider: "github",
    });
  };

  const handleSignOut = async () => {
    try {
      // Sign out from Better Auth
      await signOut();
      
      // Also clear GitHub App session
      await fetch('/api/auth/github-app', {
        method: 'DELETE',
      });
      
      // Clear GitHub App session state
      setGitHubAppSession(null);
      
      // Invalidate all tRPC queries to clear cached data
      utils.invalidate();
      
      // Force a page refresh to clear all cached data
      router.refresh();
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even if there's an error, try to refresh the page
      router.refresh();
    }
  };

  const installGitHubApp = () => {
    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'gh-gg-dev';
    const installUrl = `https://github.com/apps/${appName}/installations/new`;
    window.open(installUrl, '_blank');
  };

  return {
    // Session data
    session: unifiedSession,
    user: unifiedSession.user,
    isSignedIn: unifiedSession.isSignedIn,
    authType: unifiedSession.authType,
    installationId: unifiedSession.installationId,
    
    // Loading states
    isLoading: isBetterAuthPending || isGitHubAppLoading,
    isBetterAuthPending,
    isGitHubAppLoading,
    
    // Errors
    error: betterAuthError || githubAppError,
    betterAuthError,
    githubAppError,
    
    // Actions
    signIn: handleSignIn,
    signOut: handleSignOut,
    installGitHubApp,
    refreshGitHubAppSession: checkGitHubAppSession,
  };
}

// Re-export Better Auth hooks for direct use if needed
export { useSession, signIn, signOut }; 