import { auth } from './auth';
import { getSession as getGitHubAppSession } from './github-app-auth';
import { headers } from 'next/headers';

export interface UnifiedSession {
  user: {
    id: string;
    name: string;
    email?: string;
    image?: string;
    login?: string;
    accountType?: 'User' | 'Organization';
  } | null;
  isSignedIn: boolean;
  authType: 'oauth' | 'github-app' | null;
  installationId?: number;
}

/**
 * Get unified session from server-side
 * Tries Better Auth first, then GitHub App auth
 */
export async function getUnifiedSession(): Promise<UnifiedSession> {
  try {
    // Try Better Auth first
    const headersList = await headers();
    const betterAuthSession = await auth.api.getSession({
      headers: headersList,
    } as Request);

    if (betterAuthSession?.user) {
      return {
        user: {
          id: betterAuthSession.user.id,
          name: betterAuthSession.user.name,
          email: betterAuthSession.user.email || undefined,
          image: betterAuthSession.user.image || undefined,
        },
        isSignedIn: true,
        authType: 'oauth',
      };
    }

    // Fallback to GitHub App auth
    const githubAppSession = await getGitHubAppSession();
    if (githubAppSession) {
      return {
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
      };
    }

    // No session found
    return {
      user: null,
      isSignedIn: false,
      authType: null,
    };
  } catch (error) {
    console.error('Failed to get unified session:', error);
    return {
      user: null,
      isSignedIn: false,
      authType: null,
    };
  }
} 