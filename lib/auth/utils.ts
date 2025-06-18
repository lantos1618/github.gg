import type { Session } from 'next-auth';
import type { AuthenticatedUser, AuthenticatedSession } from './types';

export { type AuthenticatedUser, type AuthenticatedSession } from './types';

/**
 * Safely extracts the access token from the session
 */
export function getAccessToken(session: Session | null): string | null {
  return session?.user?.accessToken || null;
}

/**
 * Type guard to check if the user is authenticated
 */
export function isAuthenticated(
  session: Session | null
): session is AuthenticatedSession {
  return Boolean(session?.user?.id && session.user.accessToken);
}

/**
 * Asserts that the user is authenticated and returns the access token
 * @throws {Error} If the user is not authenticated
 */
export function requireAccessToken(session: Session | null): string {
  if (!isAuthenticated(session)) {
    throw new Error('No access token found in session');
  }
  return session.user.accessToken;
}

/**
 * Type-safe way to get the authenticated user from the session
 */
export function getAuthenticatedUser(session: Session | null): AuthenticatedUser | null {
  return isAuthenticated(session) ? session.user : null;
}
