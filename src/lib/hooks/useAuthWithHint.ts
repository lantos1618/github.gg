import { useAuth } from '@/lib/auth/client';
import { useSessionHint } from '@/lib/session-context';
import type { User } from '@/lib/auth/types';

/**
 * useAuth() with server session hint fallback.
 *
 * Prevents flash of unauthenticated UI by using the server-provided
 * session hint until the async useAuth() hook resolves.
 */
export function useAuthWithHint() {
  const hint = useSessionHint();
  const auth = useAuth();

  const hintUser: User | null = hint
    ? { id: hint.userId, name: hint.name ?? '', email: '', image: hint.image, githubUsername: hint.githubUsername }
    : null;

  return {
    ...auth,
    isSignedIn: auth.isSignedIn || !!hint,
    user: auth.user ?? hintUser,
    isLoading: auth.isLoading && !hint,
  };
}
