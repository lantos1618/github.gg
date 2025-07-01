import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

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

    if (!installationId || typeof installationId !== 'number') {
      return NextResponse.json({ 
        error: 'Invalid installation ID provided' 
      }, { status: 400 });
    }

    console.log('🔗 Linking installation', installationId, 'to user:', session.user.id);

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

    console.log('✅ Successfully linked installation', installationId, 'to user:', session.user.id);

    return NextResponse.json({ 
      success: true,
      message: 'GitHub App installation linked successfully',
      installationId: installationId
    });

  } catch (error) {
    console.error('❌ Error linking installation:', error);
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