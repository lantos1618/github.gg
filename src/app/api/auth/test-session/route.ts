import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID, createHmac, createHash, timingSafeEqual } from 'crypto';

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
// A session-minting test endpoint must only run on a local development server.
// Forwarded headers can be spoofed, so require both the request URL and Host
// to name a loopback interface; use forwarded IPs only as an extra rejection.
function isLoopbackHost(host: string | null): boolean {
  return !!host && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host);
}

function isLoopbackIp(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

export function isTestSessionAllowed(request: Request): boolean {
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.VERCEL_ENV ||
    process.env.ENABLE_TEST_SESSION !== 'true'
  ) {
    return false;
  }

  const expectedSecret = process.env.TEST_SESSION_SECRET;
  const suppliedSecret = request.headers.get('x-test-session-secret');
  // Keep this independent of BETTER_AUTH_SECRET. A short or unset test secret
  // must never enable account creation, even on a development server.
  if (
    !expectedSecret || expectedSecret.length < 32 || !suppliedSecret ||
    expectedSecret === process.env.BETTER_AUTH_SECRET
  ) return false;
  const expectedDigest = createHash('sha256').update(expectedSecret).digest();
  const suppliedDigest = createHash('sha256').update(suppliedSecret).digest();
  if (!timingSafeEqual(expectedDigest, suppliedDigest)) return false;

  try {
    const url = new URL(request.url);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (!isLoopbackHost(url.host) || !isLoopbackHost(request.headers.get('host'))) return false;
    if (request.headers.get('host')?.toLowerCase() !== url.host.toLowerCase()) return false;

    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return false;

    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor && !forwardedFor.split(',').every(ip => isLoopbackIp(ip.trim()))) return false;
    const realIp = request.headers.get('x-real-ip');
    if (realIp && !isLoopbackIp(realIp.trim())) return false;

    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isTestSessionAllowed(request)) {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
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
      secure: process.env.NODE_ENV === 'production',
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
export async function DELETE(request: Request) {
  if (!isTestSessionAllowed(request)) {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
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
