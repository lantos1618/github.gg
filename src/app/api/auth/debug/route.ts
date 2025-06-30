import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
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
    });
  } catch (error) {
    console.error('[debug] Error getting auth debug info:', error);
    return NextResponse.json({ error: 'Failed to get debug info' }, { status: 500 });
  }
} 