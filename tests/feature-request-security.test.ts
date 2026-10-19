import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextRequest } from 'next/server';

type SentEmail = { userEmail: string; featureRequest: string };
type RateLimitResult =
  | { status: 'allowed' }
  | { status: 'limited'; retryAfterSeconds: number }
  | { status: 'unavailable' };

const sentEmails: SentEmail[] = [];
const checkedEmails: string[] = [];
let rateLimitResult: RateLimitResult = { status: 'allowed' };

// Keep a reference to the real limiter logic before replacing the route's
// dependency with a stub; these tests never contact Redis.
const { applyFeatureRequestRateLimits } = await import('../src/lib/rate-limit/feature-request');

// This replaces the sender before the route is imported. No test sends email.
mock.module('../src/lib/email/resend', () => ({
  sendFeatureRequestEmail: async (email: SentEmail) => {
    sentEmails.push(email);
    return { data: { id: 'test-only' }, error: null };
  },
}));

mock.module('../src/lib/rate-limit/feature-request', () => ({
  checkFeatureRequestRateLimit: async (email: string): Promise<RateLimitResult> => {
    checkedEmails.push(email);
    return rateLimitResult;
  },
}));

const { POST } = await import('../src/app/api/feature-request/route');

function request(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/feature-request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

function jsonRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return request(JSON.stringify(body), headers);
}

beforeEach(() => {
  sentEmails.length = 0;
  checkedEmails.length = 0;
  rateLimitResult = { status: 'allowed' };
});

describe('feature request endpoint', () => {
  test('uses the validated email regardless of spoofed IP headers and escapes HTML', async () => {
    const body = { email: ' Alice@example.com ', feature: '  <b>Hello & goodbye</b>  ' };
    const first = await POST(jsonRequest(body, { 'x-forwarded-for': '1.2.3.4' }));
    const second = await POST(jsonRequest(body, { 'x-forwarded-for': '5.6.7.8' }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(checkedEmails).toEqual(['Alice@example.com', 'Alice@example.com']);
    expect(sentEmails).toEqual([
      { userEmail: 'Alice@example.com', featureRequest: '&lt;b&gt;Hello &amp; goodbye&lt;/b&gt;' },
      { userEmail: 'Alice@example.com', featureRequest: '&lt;b&gt;Hello &amp; goodbye&lt;/b&gt;' },
    ]);
  });

  test('rejects malformed values before checking limits or sending email', async () => {
    const malformed = [
      null,
      [],
      { email: { toString: 'attacker' }, feature: 'Please add this' },
      { email: 'alice@example.com', feature: { slice: 'attacker' } },
      { email: 'alice@example.com', feature: '   ' },
      { email: 'alice@example.com', feature: 'x'.repeat(5001) },
      { email: 'a'.repeat(255), feature: 'Please add this' },
      { email: 'alice@example.com\r\nBcc: attacker@example.com', feature: 'Please add this' },
    ];

    for (const body of malformed) {
      expect((await POST(jsonRequest(body))).status).toBe(400);
    }
    expect((await POST(request('{broken json'))).status).toBe(400);
    expect((await POST(request('{}', { 'content-type': 'text/plain' }))).status).toBe(415);
    expect(checkedEmails).toEqual([]);
    expect(sentEmails).toEqual([]);
  });

  test('rejects oversized streamed and declared bodies before sending email', async () => {
    const oversized = JSON.stringify({
      email: 'alice@example.com',
      feature: 'x'.repeat(25 * 1024),
    });
    expect((await POST(request(oversized))).status).toBe(413);
    expect((await POST(request('{}', { 'content-length': String(25 * 1024) }))).status).toBe(413);
    expect(checkedEmails).toEqual([]);
    expect(sentEmails).toEqual([]);
  });

  test('fails closed when the durable limiter is unavailable or denies a request', async () => {
    rateLimitResult = { status: 'unavailable' };
    expect((await POST(jsonRequest({ email: 'alice@example.com', feature: 'Idea' }))).status).toBe(503);

    rateLimitResult = { status: 'limited', retryAfterSeconds: 120 };
    const limited = await POST(jsonRequest({ email: 'alice@example.com', feature: 'Idea' }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('120');
    expect(sentEmails).toEqual([]);
  });
});

describe('feature request rate limit policy', () => {
  test('uses a hashed normalized address and a shared global quota', async () => {
    const emailKeys: string[] = [];
    const globalKeys: string[] = [];
    const limiters = {
      email: { limit: async (key: string) => {
        emailKeys.push(key);
        return { success: true, reset: Date.now() + 60_000 };
      } },
      global: { limit: async (key: string) => {
        globalKeys.push(key);
        return { success: true, reset: Date.now() + 60_000 };
      } },
    };

    expect((await applyFeatureRequestRateLimits('Alice@example.com', limiters)).status).toBe('allowed');
    expect((await applyFeatureRequestRateLimits('alice@example.com', limiters)).status).toBe('allowed');
    expect(emailKeys[0]).toBe(emailKeys[1]);
    expect(emailKeys[0]).not.toContain('@');
    expect(globalKeys).toEqual(['all', 'all']);
  });

  test('fails closed when Redis is absent or a limiter call fails', async () => {
    expect(await applyFeatureRequestRateLimits('alice@example.com', {
      email: null,
      global: null,
    })).toEqual({ status: 'unavailable' });

    const result = await applyFeatureRequestRateLimits('alice@example.com', {
      email: { limit: async () => ({ success: true, reset: Date.now() + 60_000 }) },
      global: { limit: async () => { throw new Error('Redis unavailable'); } },
    });
    expect(result).toEqual({ status: 'unavailable' });
  });
});
