import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID, createHmac } from 'crypto';

const TEST_USER_PREFIX = 'test-';

/**
 * Sign a cookie value the same way better-auth does (HMAC-SHA256, base64).
 */
function signCookie(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64');
  return `${value}.${signature}`;
}

/**
 * Dev-only endpoint to create a test session for Playwright e2e tests.
 * Creates a test user + session in the database and returns a properly signed cookie.
 *
 * POST /api/auth/test-session
 * Body: { username?: string, email?: string }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const username = body.username || 'e2e-test-user';
  const email = body.email || `e2e-${username}@github.gg`;
  const testUserId = `${TEST_USER_PREFIX}${username}`;

  try {
    // Upsert test user
    const existingUser = await db.query.user.findFirst({
      where: eq(schema.user.id, testUserId),
    });

    if (!existingUser) {
      await db.insert(schema.user).values({
        id: testUserId,
        name: `E2E Test (${username})`,
        email,
        emailVerified: true,
        githubUsername: username,
        vmTier: 'pro',
        role: 'user',
        image: `https://avatars.githubusercontent.com/u/1?v=4`,
      });
    }

    // Create a fresh session
    const sessionToken = randomUUID();
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(schema.session).values({
      id: sessionId,
      token: sessionToken,
      userId: testUserId,
      expiresAt,
      ipAddress: '127.0.0.1',
      userAgent: 'Playwright E2E',
    });

    // Sign the cookie value the same way better-auth does
    const secret = process.env.BETTER_AUTH_SECRET!;
    const signedValue = signCookie(sessionToken, secret);

    const response = NextResponse.json({
      success: true,
      user: { id: testUserId, name: `E2E Test (${username})`, email, githubUsername: username },
      sessionId,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
    });

    // Set the better-auth session cookie with proper signature
    response.cookies.set('better-auth.session_token', signedValue, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error('[test-session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create test session', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/test-session - Clean up test sessions and users
 */
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const testUsers = await db.query.user.findMany({
      where: (u, { like }) => like(u.id, `${TEST_USER_PREFIX}%`),
    });

    for (const u of testUsers) {
      await db.delete(schema.session).where(eq(schema.session.userId, u.id));
    }

    return NextResponse.json({ success: true, cleaned: testUsers.length });
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
