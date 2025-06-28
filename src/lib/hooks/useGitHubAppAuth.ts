'use client';

import { useState, useEffect } from 'react';
import { GitHubAppSession } from '../github-app-auth';
import { useRouter } from 'next/navigation';

export function useGitHubAppAuth() {
  const [session, setSession] = useState<GitHubAppSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/github-app');
      
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Failed to check session:', err);
      setError('Failed to check authentication status');
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/github-app', {
        method: 'DELETE',
      });

      if (response.ok) {
        setSession(null);
        // Redirect to install page after logout
        router.push('/install');
      } else {
        setError('Failed to sign out');
      }
    } catch (err) {
      console.error('Failed to sign out:', err);
      setError('Failed to sign out');
    }
  };

  const installApp = () => {
    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'gh-gg-dev';
    const installUrl = `https://github.com/apps/${appName}/installations/new`;
    window.open(installUrl, '_blank');
  };

  return {
    session,
    isLoading,
    error,
    isSignedIn: !!session,
    signOut,
    installApp,
    refreshSession: checkSession,
  };
} 