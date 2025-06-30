import { Octokit } from '@octokit/rest';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { getInstallationToken, githubApp } from './app';
import type { BetterAuthSession } from './types';

// User type for authentication
interface AuthenticatedUser {
  id: string;
  name?: string;
}

// Factory functions for different authentication methods
export class GitHubAuthFactory {
  // Create service with public API key (for unauthenticated users)
  static createPublic(): Octokit {
    console.log('🔑 Using public GitHub API key');
    return new Octokit({ auth: env.GITHUB_PUBLIC_API_KEY });
  }

  // Create service with GitHub App installation (for authenticated users with installations)
  static async createWithApp(session: BetterAuthSession): Promise<Octokit | null> {
    if (!session?.user?.id) {
      return null;
    }

    try {
      const userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, session.user.id),
          eq(account.providerId, 'github')
        ),
      });

      if (userAccount?.installationId) {
        console.log(`✅ Using GitHub App installation ${userAccount.installationId} for authenticated user`);
        const installationToken = await getInstallationToken(userAccount.installationId);
        return new Octokit({ auth: installationToken });
      }
    } catch (error) {
      console.warn('Failed to create GitHub App service:', error);
    }

    return null;
  }

  // Create service with OAuth token (for authenticated users without installations)
  static async createWithOAuth(session: BetterAuthSession): Promise<Octokit | null> {
    if (!session?.user?.id) {
      return null;
    }

    try {
      const { accessToken } = await auth.api.getAccessToken({
        body: {
          providerId: 'github',
          userId: session.user.id,
        },
        headers: {},
      });
      
      if (accessToken) {
        console.log('🔐 Using OAuth token for authenticated user');
        return new Octokit({ auth: accessToken });
      }
    } catch (error) {
      console.warn('Failed to get OAuth token:', error);
    }

    return null;
  }

  // Create service with unified authentication (requires GitHub App installation)
  static async createAuthenticated(session: unknown): Promise<Octokit> {
    console.log('🔍 Creating GitHub service with session:', !!session);

    if (!session || typeof session !== 'object' || !('user' in session) || !session.user) {
      throw new Error('Authentication required. Please sign in with GitHub OAuth.');
    }

    const user = session.user as AuthenticatedUser;
    console.log(`👤 Authenticated user: ${user.name} (${user.id})`);

    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, user.id),
        eq(account.providerId, 'github')
      ),
    });

    if (!userAccount?.installationId) {
      throw new Error('GitHub App installation required. Please install the GitHub App to use this service.');
    }

    // Verify the installation exists and is accessible
    try {
      await githubApp.octokit.request(
        'GET /app/installations/{installation_id}',
        {
          installation_id: userAccount.installationId,
        }
      );
      console.log(`✅ Using GitHub App installation ${userAccount.installationId} for authenticated user`);
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error(`❌ Installation ${userAccount.installationId} not accessible:`, e.message);
      
      // Clear the invalid installation
      await db.update(account)
        .set({ 
          installationId: null,
          updatedAt: new Date()
        })
        .where(and(
          eq(account.userId, user.id),
          eq(account.providerId, 'github')
        ));
      
      throw new Error('GitHub App installation is invalid. Please reinstall the GitHub App.');
    }

    // Create GitHub App service with installation token
    try {
      const installationToken = await getInstallationToken(userAccount.installationId);
      return new Octokit({ auth: installationToken });
    } catch (error: unknown) {
      console.error('Failed to create GitHub App service:', error);
      throw new Error('Failed to create GitHub service. Please try again.');
    }
  }
} 