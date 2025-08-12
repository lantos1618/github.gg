import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { AuthInterface, User, DevUser } from './types';

// React hook that implements the AuthInterface for dev mode
export function useDevAuthAdapter(): AuthInterface {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/dev');
      const data = await response.json();
      
      if (data.user) {
        setUser(convertDevUserToUser(data.user));
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setError('Failed to check session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const signIn = async (): Promise<void> => {
    // For dev auth, we need to show a user selection dialog
    // This will be handled by the UI component
    // The adapter just needs to provide a way to sign in with a specific user
    throw new Error('Dev auth requires userId parameter. Use signInWithUserId instead.');
  };

  const signInWithUserId = async (userId: string): Promise<void> => {
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
        setUser(convertDevUserToUser(data.user));
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

  const signOut = async (): Promise<void> => {
    try {
      await fetch('/api/auth/dev', { method: 'DELETE' });
      setUser(null);
      utils.invalidate();
      router.push('/');
      router.refresh();
      toast.success('Signed out successfully');
    } catch (err) {
      console.error('Sign out failed:', err);
      toast.error('Sign out failed. Please try again.');
    }
  };

  const convertDevUserToUser = (devUser: DevUser): User => {
    return {
      id: devUser.id,
      email: devUser.email,
      name: devUser.name,
      image: devUser.image,
      githubUsername: devUser.githubUsername,
    };
  };

  return {
    user,
    isSignedIn: !!user,
    isLoading,
    error,
    signIn,
    signOut,
    checkSession,
    // Add the dev-specific method
    signInWithUserId,
  };
}
