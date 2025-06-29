import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { env } from '../env';
import { sql } from 'drizzle-orm';
import { getUserFromInstallation } from '../github/app';
import { githubAppInstallations } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Unified session interface
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

// GitHub App session interface
export interface GitHubAppSession {
  installationId: number;
  userId: string;
  name: string;
  email?: string;
  image?: string;
  login: string;
  accountType: 'User' | 'Organization';
}

// Session cookie name
const GITHUB_APP_SESSION_COOKIE = 'github-app-session';

// Ensure database connection is established before initializing auth
const ensureDbConnection = async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed for Better Auth:', error);
    return false;
  }
};

// Create Better Auth instance
const createBetterAuth = () => {
  return betterAuth({
    trustedOrigins: ["https://github.gg", "https://dev.github.gg"],
    database: drizzleAdapter(db, {
      schema,
      provider: 'pg',
      usePlural: false,
    }),
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        scope: ['repo', 'read:user', 'user:email', 'read:org'],
      }
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
    secret: env.BETTER_AUTH_SECRET,
  });
};

// Export Better Auth instance
export const betterAuthInstance = createBetterAuth();

// GitHub App Session Management
export class GitHubAppSessionManager {
  // Create session from installation ID
  static async createSessionFromInstallation(installationId: number): Promise<GitHubAppSession | null> {
    try {
      const user = await getUserFromInstallation(installationId);
      if (!user) return null;

      return {
        installationId: user.installationId,
        userId: user.id,
        name: user.name,
        email: user.email ?? undefined,
        image: user.image,
        login: user.login,
        accountType: user.accountType === 'User' ? 'User' : 'Organization',
      };
    } catch (error) {
      console.error('Failed to create session from installation:', error);
      return null;
    }
  }

  // Get current session from cookies
  static async getSession(): Promise<GitHubAppSession | null> {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(GITHUB_APP_SESSION_COOKIE);
      
      if (!sessionCookie?.value) {
        return null;
      }

      const session = JSON.parse(sessionCookie.value) as GitHubAppSession;
      
      // Verify the installation still exists
      const installation = await db.query.githubAppInstallations.findFirst({
        where: eq(githubAppInstallations.installationId, session.installationId),
      });

      if (!installation) {
        // Installation was removed, clear session
        await this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  // Set session in cookies
  static async setSession(session: GitHubAppSession) {
    const cookieStore = await cookies();
    cookieStore.set(GITHUB_APP_SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  // Clear session
  static async clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete(GITHUB_APP_SESSION_COOKIE);
  }
}

// Unified Authentication Service
export class AuthService {
  // Get unified session from server-side
  static async getUnifiedSession(): Promise<UnifiedSession> {
    try {
      // Try Better Auth first
      const headersList = await import('next/headers').then(m => m.headers());
      const betterAuthSession = await betterAuthInstance.api.getSession({
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
      const githubAppSession = await GitHubAppSessionManager.getSession();
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

  // Require authentication - redirect to install if not authenticated
  static async requireAuth(): Promise<UnifiedSession> {
    const session = await this.getUnifiedSession();
    if (!session.isSignedIn) {
      redirect('/install');
    }
    return session;
  }

  // Optional authentication - return session if exists
  static async optionalAuth(): Promise<UnifiedSession> {
    return await this.getUnifiedSession();
  }
}

// Verify connection on module load (but don't block)
if (process.env.NODE_ENV !== 'test') {
  ensureDbConnection().then((connected) => {
    if (!connected) {
      console.warn('⚠️  Better Auth may not work properly without database connection');
    }
  });
}

// Re-export for backward compatibility
export const auth = betterAuthInstance;
export const getUnifiedSession = AuthService.getUnifiedSession;
export const requireAuth = AuthService.requireAuth;
export const optionalAuth = AuthService.optionalAuth; 