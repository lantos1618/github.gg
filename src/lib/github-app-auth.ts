import { getUserFromInstallation } from './github/app';
import { db } from '../db';
import { githubAppInstallations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Simple session management for GitHub App installations
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
const SESSION_COOKIE = 'github-app-session';

// Create session from installation ID
export async function createSessionFromInstallation(installationId: number): Promise<GitHubAppSession | null> {
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
export async function getSession(): Promise<GitHubAppSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    
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
      await clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

// Set session in cookies
export async function setSession(session: GitHubAppSession) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

// Clear session
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Require authentication - redirect to install if not authenticated
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect('/install');
  }
  return session;
}

// Optional authentication - return session if exists, null if not
export async function optionalAuth(): Promise<GitHubAppSession | null> {
  return await getSession();
} 