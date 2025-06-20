'use client';

import { useSession, signIn, signOut } from '@/lib/auth-client';

export function useAuth() {
  const { data: session, isPending, error } = useSession();

  const handleSignIn = async () => {
    await signIn.social({
      provider: "github",
    });
  };

  const handleSignOut = async () => {
    await signOut();
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