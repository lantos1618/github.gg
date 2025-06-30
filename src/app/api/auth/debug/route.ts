import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GitHubAppSessionManager } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get Better Auth session
    const betterAuthSession = await auth.api.getSession(request);
    
    // Get GitHub App session
    const githubAppSession = await GitHubAppSessionManager.getSession();
    
    // Get cookies for debugging
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return [name, value];
      })
    );
    
    return NextResponse.json({
      betterAuth: {
        hasSession: !!betterAuthSession,
        user: betterAuthSession?.user ? {
          id: betterAuthSession.user.id,
          name: betterAuthSession.user.name,
          email: betterAuthSession.user.email,
        } : null,
      },
      githubApp: {
        hasSession: !!githubAppSession,
        session: githubAppSession,
      },
      cookies: {
        betterAuth: !!cookies['better-auth-session'],
        githubApp: !!cookies['github-app-session'],
        all: Object.keys(cookies),
      },
    });
  } catch (error) {
    console.error('[debug] Error getting auth debug info:', error);
    return NextResponse.json({ error: 'Failed to get debug info' }, { status: 500 });
  }
} 