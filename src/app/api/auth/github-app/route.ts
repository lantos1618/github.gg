import { NextRequest, NextResponse } from 'next/server';
import { createSessionFromInstallation, setSession, getSession } from '@/lib/github-app-auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({ 
      session: {
        id: session.userId,
        name: session.name,
        email: session.email,
        image: session.image,
        login: session.login,
        accountType: session.accountType
      }
    });

  } catch (error) {
    console.error('Failed to get GitHub App session:', error);
    return NextResponse.json({ session: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { installationId } = await request.json();

    if (!installationId) {
      console.error('[github-app] No installationId provided in POST body');
      return NextResponse.json(
        { error: 'Installation ID is required' },
        { status: 400 }
      );
    }

    console.log('[github-app] Creating session from installationId:', installationId);

    // Create session from installation
    let session: any = null;
    try {
      session = await createSessionFromInstallation(installationId);
    } catch (err) {
      let details = err;
      if (typeof err === 'object' && err !== null) {
        if ('stack' in err) details = (err as any).stack;
        else if ('message' in err) details = (err as any).message;
      }
      console.error('[github-app] Error in createSessionFromInstallation:', details);
      return NextResponse.json(
        { error: 'Failed to create session from installation', details },
        { status: 500 }
      );
    }

    if (!session) {
      console.error('[github-app] createSessionFromInstallation returned null for installationId:', installationId);
      return NextResponse.json(
        { error: 'Failed to create session from installation' },
        { status: 500 }
      );
    }

    // Set session in cookies
    await setSession(session);

    return NextResponse.json({ 
      success: true, 
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        image: session.image,
        login: session.login,
        accountType: session.accountType
      }
    });

  } catch (error) {
    let details = error;
    if (typeof error === 'object' && error !== null) {
      if ('stack' in error) details = (error as any).stack;
      else if ('message' in error) details = (error as any).message;
    }
    console.error('[github-app] Failed to create GitHub App session:', details);
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Clear session
  const { clearSession } = await import('@/lib/github-app-auth');
  await clearSession();
  
  return NextResponse.json({ success: true });
} 