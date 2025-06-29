'use client';

import { useSession, signIn, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export function useAuth() {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();

  const handleSignIn = async () => {
    await signIn.social({
      provider: "github",
    });
  };

  const handleSignOut = async () => {
    try {
      // Sign out from Better Auth
      await signOut();
      
      // Also clear any GitHub App sessions
      await fetch('/api/auth/sign-out', {
        method: 'POST',
      });
      
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

  return {
    isSignedIn: !!session?.user,
    isLoading: isPending,
    user: session?.user || null,
    error,
    signIn: handleSignIn,
    signOut: handleSignOut,
    isSigningOut: false, // Better Auth handles this internally
  };
} 