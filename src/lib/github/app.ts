import { App } from '@octokit/app';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { db } from '../../db';
import { githubAppInstallations, account } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '../auth';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { SessionData, parseError } from '../types/errors';

// Initialize the GitHub App
export const githubApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
});

// Generate JWT for app authentication
export function generateAppJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 600, // 10 minutes
    iss: env.GITHUB_APP_ID,
  };

  return jwt.sign(payload, env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'), {
    algorithm: 'RS256',
  });
}

// Get installation token for a specific installation
export async function getInstallationToken(installationId: number): Promise<string> {
  try {
    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!,
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
  return await githubApp.getInstallationOctokit(installationId);
}

// Get installation ID for a repository
export async function getInstallationIdForRepo(owner: string, repo: string): Promise<number | null> {
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
    const installation = await db.query.githubAppInstallations.findFirst({
      where: eq(githubAppInstallations.installationId, installationId),
    });
    
    if (!installation) {
      return null;
    }

    // Use the stored account details from the database
    // No need to call GitHub API with installation token
    return {
      id: installation.accountId.toString(),
      name: installation.accountName || installation.accountLogin,
      email: undefined, // We don't store email for privacy reasons
      image: installation.accountAvatarUrl || undefined,
      login: installation.accountLogin,
      installationId,
      accountType: installation.accountType as 'User' | 'Organization'
    };
  } catch (error) {
    console.error('Failed to get user from installation:', error);
    return null;
  }
}

// Check if a repository is accessible through any installation
export async function isRepoAccessible(owner: string, repo: string): Promise<boolean> {
  try {
    const installationId = await getInstallationIdForRepo(owner, repo);
    if (!installationId) return false;

    // Try to get repository info to verify access
    const octokit = await getInstallationOctokit(installationId);
    await octokit.request('GET /repos/{owner}/{repo}', { owner, repo });
    return true;
  } catch {
    return false;
  }
}

// Enhanced function to get the best Octokit instance for a repository with unified auth
export async function getBestOctokitForRepo(
  owner: string, 
  repo: string, 
  session?: SessionData, 
  req?: Request
) {
  console.log(`🔍 Getting best Octokit for ${owner}/${repo} with session:`, !!session);

  // 1. Check if the logged-in user has a linked installation that covers this repo
  if (session && session.user && session.user.id) {
    
    try {
      // Get the user's linked installation
      const userAccount = await db.query.account.findFirst({
        where: and(
          eq(account.userId, session.user.id),
          eq(account.providerId, 'github')
        ),
      });

      if (userAccount?.installationId) {
        console.log(`✅ User has linked installation ${userAccount.installationId}`);
        
        // Check if this installation can access the repo
        try {
          const installationOctokit = await getInstallationOctokit(userAccount.installationId);
          await installationOctokit.request('GET /repos/{owner}/{repo}', { owner, repo });
          console.log(`✅ Installation ${userAccount.installationId} can access ${owner}/${repo}`);
          return installationOctokit;
        } catch {
          console.log(`⚠️ Installation ${userAccount.installationId} cannot access ${owner}/${repo}, trying OAuth fallback`);
        }
      }
    } catch (error) {
      console.error('Error checking user installation:', error);
    }
  }

  // 2. Try to get installation-specific access for this repo
  const installationId = await getInstallationIdForRepo(owner, repo);
  if (installationId) {
    console.log(`✅ Found installation ${installationId} for ${owner}/${repo}`);
    return await getInstallationOctokit(installationId);
  }

  // 3. If user is logged in, try to use their OAuth token
  if (session && session.user && session.user.id && req) {
    try {
      const { accessToken } = await auth.api.getAccessToken({
        body: {
          providerId: 'github',
          userId: session.user.id,
        },
        headers: req.headers,
      });
      
      if (accessToken) {
        console.log(`✅ Using OAuth token for ${owner}/${repo}`);
        return new (await import('@octokit/rest')).Octokit({ auth: accessToken });
      }
    } catch (error) {
      console.warn('Failed to get OAuth token, falling back to public API:', error);
    }
  }

  // 4. Fallback to app-level access (for public repos)
  console.log(`⚠️ Using app-level access for ${owner}/${repo}`);
  return githubApp.octokit;
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