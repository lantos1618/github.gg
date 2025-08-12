'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';

export interface DevUser {
  id: string;
  email: string;
  name: string;
  image: string;
  githubUsername: string;
}

export interface DevSession {
  user: DevUser;
  expiresAt: number;
}

export function useDevAuth() {
  const [user, setUser] = useState<DevUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/dev');
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setError('Failed to check session');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        toast.success('Signed in successfully');
        router.refresh();
      } else {
        throw new Error(data.error || 'Sign in failed');
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
      toast.error('Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/dev', { method: 'DELETE' });
      setUser(null);
      utils.invalidate(); // Invalidate all tRPC queries
      router.push('/');
      router.refresh();
      toast.success('Signed out successfully');
    } catch (err) {
      console.error('Sign out failed:', err);
      toast.error('Sign out failed. Please try again.');
    }
  };

  return {
    user,
    isSignedIn: !!user,
    isLoading,
    error,
    signIn,
    signOut,
    checkSession,
  };
}

// Export available dev users for UI
export const DEV_USERS = [
  {
    id: 'dev-user-1',
    email: 'dev@github.gg',
    name: 'Development User',
    image: 'https://github.com/github.png',
    githubUsername: 'dev-user',
  },
  {
    id: 'dev-user-2', 
    email: 'admin@github.gg',
    name: 'Admin User',
    image: 'https://github.com/github.png',
    githubUsername: 'admin-user',
  }
]; 