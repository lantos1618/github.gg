import { App } from '@octokit/app';
import jwt from 'jsonwebtoken';
import { db } from '@/db';
import { githubAppInstallations, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { SessionData, parseError } from '@/lib/types/errors';

// Initialize the GitHub App (only if configured)
export const githubApp = process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY 
  ? new App({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  : null;

// Helper to check if GitHub App is configured
export const isGitHubAppConfigured = () => {
  return !!process.env.GITHUB_APP_ID && !!process.env.GITHUB_PRIVATE_KEY;
};

// Generate JWT for app authentication
export function generateAppJWT(): string {
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
    throw new Error('GitHub App not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 600, // 10 minutes
    iss: process.env.GITHUB_APP_ID,
  };

  return jwt.sign(payload, process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'), {
    algorithm: 'RS256',
  });
}

// Get installation token for a specific installation
export async function getInstallationToken(installationId: number): Promise<string> {
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
    throw new Error('GitHub App not configured');
  }

  try {
    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY,
      installationId,
    });

    const { token } = await auth({ type: 'installation' });
    return token;
  } catch (error: unknown) {
    const errorMessage = parseError(error);
    throw new Error(`Failed to get installation token: ${errorMessage}`);
  }
}

// Get Octokit instance for a specific installation
export async function getInstallationOctokit(installationId: number) {
  if (!githubApp) {
    throw new Error('GitHub App not configured');
  }
  return await githubApp.getInstallationOctokit(installationId);
}

// Get installation ID for a repository
export async function getInstallationIdForRepo(owner: string, repo: string): Promise<number | null> {
  if (!githubApp) {
    console.log('GitHub App not configured - running in development mode without GitHub App features');
    return null;
  }

  try {
    // First, try to get the installation for the repository
    const { data } = await githubApp.octokit.request(
      'GET /repos/{owner}/{repo}/installation',
      {
        owner,
        repo,
      }
    );
    return data.id;
  } catch (error) {
    console.error(`No installation found for ${owner}/${repo}:`, error);
    return null;
  }
}

// Get installation ID for a user/organization
export async function getInstallationIdForAccount(accountId: number): Promise<number | null> {
  try {
    const installation = await db.query.githubAppInstallations.findFirst({
      where: eq(githubAppInstallations.accountId, accountId),
    });
    return installation?.installationId || null;
  } catch {
    console.error('Failed to get installation for account');
    return null;
  }
}

// Get user details from installation
export async function getUserFromInstallation(installationId: number) {
  try {
    // Find the user account that has this installation
    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.installationId, installationId),
        eq(account.providerId, 'github')
      ),
    });

    if (!userAccount) {
      return null;
    }

    // Get installation details for additional user info
    const installation = await db.query.githubAppInstallations.findFirst({
      where: eq(githubAppInstallations.installationId, installationId),
    });

    // Return the actual user ID from the database, not the GitHub account ID
    return {
      id: userAccount.userId, // This is the correct user ID that references user.id
      name: installation?.accountName || installation?.accountLogin || 'Unknown',
      email: undefined, // We don't store email for privacy reasons
      image: installation?.accountAvatarUrl || undefined,
      login: installation?.accountLogin || 'unknown',
      installationId,
      accountType: installation?.accountType as 'User' | 'Organization' || 'User'
    };
  } catch (error) {
    console.error('Failed to get user from installation:', error);
    return null;
  }
}

// Helper function to create authenticated Octokit instance
export async function createAuthenticatedOctokit(session: SessionData, req?: Request): Promise<Octokit> {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }

  return new Octokit({
    auth: session.accessToken,
    request: req ? { fetch: req.signal ? undefined : fetch } : undefined,
  });
}
