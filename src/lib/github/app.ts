import { App } from '@octokit/app';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { db } from '../../db';
import { githubAppInstallations } from '../../db/schema';
import { eq } from 'drizzle-orm';

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
    const { data } = await githubApp.octokit.request(
      'POST /app/installations/{installation_id}/access_tokens',
      {
        installation_id: installationId,
      }
    );
    return data.token;
  } catch (error) {
    console.error('Failed to get installation token:', error);
    throw new Error('Failed to get installation token');
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

// Get the best available Octokit instance for a repository
export async function getBestOctokitForRepo(owner: string, repo: string) {
  // First, try to get installation-specific access
  const installationId = await getInstallationIdForRepo(owner, repo);
  if (installationId) {
    return await getInstallationOctokit(installationId);
  }

  // Fallback to app-level access (for public repos)
  return githubApp.octokit;
} 