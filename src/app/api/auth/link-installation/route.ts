import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

/**
 * Verify the caller actually has access to the GitHub App installation they
 * claim to own. Without this check ANY signed-in user could POST an
 * installationId they obtained elsewhere (webhook log, URL leak, brute
 * force) and bind that org's installation to their own account — giving
 * them access to that org's private repos via our app's token.
 *
 * GitHub's /user/installations endpoint returns only installations
 * accessible to the authenticated user (org member or installer), so a
 * presence check there is sufficient.
 */
async function userHasInstallationAccess(accessToken: string, installationId: number): Promise<boolean> {
  const octokit = new Octokit({ auth: accessToken });
  try {
    let page = 1;
    while (page <= 10) {
      const { data } = await octokit.request('GET /user/installations', {
        per_page: 100,
        page,
      });
      if (data.installations.some(i => i.id === installationId)) return true;
      if (data.installations.length < 100) return false;
      page += 1;
    }
    return false;
  } catch (err) {
    console.error('[link-installation] /user/installations failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the current session using better-auth
    const session = await auth.api.getSession(request);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in first' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { installationId } = body;

    if (!installationId || typeof installationId !== 'number' || !Number.isFinite(installationId) || installationId <= 0) {
      return NextResponse.json({
        error: 'Invalid installation ID provided'
      }, { status: 400 });
    }

    // Verify the caller has access to this installation BEFORE doing anything else.
    let accessToken: string | null = null;
    try {
      const tokenResult = await auth.api.getAccessToken({
        body: { providerId: 'github', userId: session.user.id },
        headers: {},
      });
      accessToken = tokenResult.accessToken ?? null;
    } catch (err) {
      console.error('[link-installation] failed to get OAuth token:', err instanceof Error ? err.message : err);
    }

    if (!accessToken) {
      return NextResponse.json({
        error: 'Unable to verify GitHub access — please sign in again.',
      }, { status: 401 });
    }

    const hasAccess = await userHasInstallationAccess(accessToken, installationId);
    if (!hasAccess) {
      return NextResponse.json({
        error: 'You do not have access to this installation. Install the GitHub App on an account or organization you own.',
      }, { status: 403 });
    }

    // Check if this installation is already linked to another user
    const existingLink = await db.query.account.findFirst({
      where: eq(account.installationId, installationId),
    });

    if (existingLink && existingLink.userId !== session.user.id) {
      return NextResponse.json({
        error: 'This GitHub App installation is already linked to another account'
      }, { status: 409 });
    }

    // Check if the current user already has a GitHub account linked
    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, session.user.id),
        eq(account.providerId, 'github')
      ),
    });

    if (!userAccount) {
      return NextResponse.json({
        error: 'No GitHub account found for this user. Please sign in with GitHub first.'
      }, { status: 404 });
    }

    // Update the user's GitHub account with the installation ID
    await db.update(account)
      .set({
        installationId: installationId,
        updatedAt: new Date()
      })
      .where(and(
        eq(account.userId, session.user.id),
        eq(account.providerId, 'github')
      ));

    return NextResponse.json({
      success: true,
      message: 'GitHub App installation linked successfully',
      installationId: installationId
    });

  } catch (error) {
    console.error('[link-installation] Error linking installation:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      error: 'Internal server error while linking installation'
    }, { status: 500 });
  }
}

// GET endpoint to check if user has a linked installation
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession(request);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user has a linked installation
    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, session.user.id),
        eq(account.providerId, 'github')
      ),
    });

    const hasLinkedInstallation = userAccount?.installationId != null;

    return NextResponse.json({ 
      hasLinkedInstallation,
      installationId: userAccount?.installationId || null
    });

  } catch (error) {
    console.error('❌ Error checking installation link:', error);
    return NextResponse.json({ 
      error: 'Internal server error while checking installation link' 
    }, { status: 500 });
  }
} 