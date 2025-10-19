'use client';

import { createAuthClient } from "better-auth/react";
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';

// Initialize the better-auth client
const { useSession, signIn, signOut: betterAuthSignOut } = createAuthClient({
  baseURL: typeof window !== 'undefined' 
    ? `${window.location.origin}/api/auth`
    : process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth`
      : "http://localhost:3000/api/auth"
});

/**
 * A simplified and robust authentication hook for the client-side.
 * It wraps the core `better-auth` functionality and provides a clean sign-out process.
 */
export function useAuth() {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  
  const handleSignIn = async (callbackURL?: string) => {
    try {
      // The `prompt: 'select_account'` is configured on the server.
      // If no callbackURL is provided, use the current page
      const redirectURL = callbackURL || (typeof window !== 'undefined' ? window.location.pathname : '/');
      await signIn.social({
        provider: "github",
        callbackURL: redirectURL
      });
    } catch (err) {
      console.error("Sign in failed:", err);
      toast.error("Sign in failed. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      // 1. Perform app-specific cleanup by calling our dedicated endpoint.
      await fetch('/api/auth/sign-out-cleanup', { method: 'POST' });
      
      // 2. Call the core `better-auth` sign-out function.
      await betterAuthSignOut();

      // 3. Clean up client-side state.
      utils.invalidate(); // Invalidate all tRPC queries
      router.push('/');
      router.refresh(); // Force a full page reload to ensure a clean state
    } catch (err) {
      console.error("Sign out failed:", err);
      toast.error("Sign out failed. Please try again.");
    }
  };

  return {
    session: session,
    user: session?.user,
    isSignedIn: !!session?.user,
    isLoading: isPending,
    error: error,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}

// Re-export Better Auth hooks for direct use if needed
export { useSession, signIn, betterAuthSignOut }; 