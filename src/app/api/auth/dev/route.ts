import { NextRequest, NextResponse } from 'next/server';
import { devAuth } from '@/lib/auth/dev-auth';
import { cookies } from 'next/headers';

const DEV_AUTH_COOKIE = 'dev-auth-token';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Create token for the user
    const token = devAuth.createToken(userId);
    
    // Ensure user exists in database
    await devAuth.ensureUserInDatabase(userId);

    // Set cookie
    const response = NextResponse.json({ 
      success: true, 
      user: devAuth.getDevUsers().find(u => u.id === userId)
    });
    
    response.cookies.set(DEV_AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Dev auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(DEV_AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = devAuth.verifyToken(token);
    
    if (!session) {
      // Clear invalid token
      const response = NextResponse.json({ user: null });
      response.cookies.delete(DEV_AUTH_COOKIE);
      return response;
    }

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error('Dev auth session error:', error);
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(DEV_AUTH_COOKIE);
  return response;
} 