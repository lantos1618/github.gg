import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  // Only allow debug endpoint in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Get Better Auth session
    const session = await auth.api.getSession(request);
    
    // Get cookies for debugging
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return [name, value];
      })
    );
    
    return NextResponse.json({
      auth: {
        hasSession: !!session,
        user: session?.user ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        } : null,
      },
      cookies: {
        betterAuth: !!cookies['better-auth-session'],
        all: Object.keys(cookies),
      },
      config: {
        clientId: process.env.GITHUB_CLIENT_ID ? 'SET' : 'NOT_SET',
        clientSecret: process.env.GITHUB_CLIENT_SECRET ? 'SET' : 'NOT_SET',
        secret: process.env.BETTER_AUTH_SECRET ? 'SET' : 'NOT_SET',
      }
    });
  } catch (error) {
    console.error('[debug] Error getting auth debug info:', error);
    return NextResponse.json({ error: 'Failed to get debug info', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 