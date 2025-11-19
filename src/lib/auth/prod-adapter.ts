import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { useSession, signIn, betterAuthSignOut } from './auth-client-factory';
import { AuthInterface, User } from './types';

// React hook that implements the AuthInterface for production mode
export function useProdAuthAdapter(): AuthInterface {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  
  const handleSignIn = async (): Promise<void> => {
    try {
      // The `prompt: 'select_account'` is configured on the server.
      await signIn.social({ provider: "github" });
    } catch (err) {
      console.error("Sign in failed:", err);
      toast.error("Sign in failed. Please try again.");
    }
  };

  const handleSignOut = async (): Promise<void> => {
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

  // Convert better-auth session to our User interface
  const convertSessionToUser = (session: unknown): User | null => {
    if (!session || typeof session !== 'object' || !('user' in session)) return null;
    
    const sessionObj = session as { user?: { id: string; email?: string; name?: string; image?: string; githubUsername?: string; username?: string } };
    if (!sessionObj.user) return null;
    
    return {
      id: sessionObj.user.id,
      email: sessionObj.user.email || '',
      name: sessionObj.user.name || '',
      image: sessionObj.user.image || '',
      githubUsername: sessionObj.user.githubUsername || sessionObj.user.username || '',
    };
  };

  return {
    user: convertSessionToUser(session),
    isSignedIn: !!session?.user,
    isLoading: isPending,
    error: error?.message || null,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
